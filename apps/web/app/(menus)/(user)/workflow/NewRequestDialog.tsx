"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { workflowTranslations, type Language } from "./translations";
import { WorkflowFormFields } from "./WorkflowFormFields";

interface Template {
  id: string;
  type: string;
  name: string;
  nameJa: string;
  description: string | null;
  descriptionJa: string | null;
  approvalSteps: number;
  formSchema: { fields: Array<{ name: string; type: string; label: string; labelJa: string; required: boolean; options?: Array<{ value: string; label: string; labelJa: string }> }> };
}

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  language: Language;
  onCreated: () => void;
}

export function NewRequestDialog({
  open,
  onOpenChange,
  templates,
  language,
  onCreated,
}: NewRequestDialogProps) {
  const t = workflowTranslations[language];
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const typeLabels: Record<string, string> = {
    leave: t.typeLeave,
    expense: t.typeExpense,
    purchase: t.typePurchase,
    overtime: t.typeOvertime,
  };

  const resetForm = useCallback(() => {
    setSelectedTemplate(null);
    setTitle("");
    setFormData({});
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleSaveDraft = useCallback(async () => {
    if (!selectedTemplate || !title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workflow/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          title: title.trim(),
          formData,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.draftSaved);
      handleClose();
      onCreated();
    } catch {
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  }, [selectedTemplate, title, formData, t, handleClose, onCreated]);

  const handleSubmit = useCallback(async () => {
    if (!selectedTemplate || !title.trim()) return;
    setSubmitting(true);
    try {
      // 1. 下書き作成
      const createRes = await fetch("/api/workflow/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          title: title.trim(),
          formData,
        }),
      });
      if (!createRes.ok) throw new Error();
      const { request } = await createRes.json();

      // 2. 提出
      const submitRes = await fetch(`/api/workflow/requests/${request.id}/submit`, {
        method: "POST",
      });
      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        throw new Error(err.error || "Submit failed");
      }

      toast.success(t.submitted);
      handleClose();
      onCreated();
    } catch (err) {
      const message = err instanceof Error && err.message.includes("supervisor")
        ? t.noSupervisor
        : t.submitError;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [selectedTemplate, title, formData, t, handleClose, onCreated]);

  const isLoading = saving || submitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.newRequestTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Template selection */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {t.selectTemplate}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(tmpl);
                    setFormData({});
                  }}
                  disabled={isLoading}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    selectedTemplate?.id === tmpl.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">
                    {language === "ja" ? tmpl.nameJa : tmpl.name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {typeLabels[tmpl.type] || tmpl.type}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedTemplate && (
            <>
              {/* Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="request-title"
                  className="block text-sm font-medium text-foreground"
                >
                  {t.requestTitle}
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  id="request-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.requestTitlePlaceholder}
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Dynamic form fields */}
              <WorkflowFormFields
                schema={selectedTemplate.formSchema}
                language={language}
                values={formData}
                onChange={setFormData}
                disabled={isLoading}
              />

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={!title.trim() || isLoading}
                >
                  {saving ? t.saving : t.saveDraft}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || isLoading}
                >
                  {submitting ? t.submitting : t.submitRequest}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
