"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  DeleteConfirmDialog,
  BackButton,
} from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPreviewDialog } from "@/components/business/forms/FormPreviewDialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFormBuilderStore,
  type FormSectionDraft,
} from "@/lib/addon-modules/forms/form-builder-store";
import { FieldPalette } from "@/components/business/forms/FieldPalette";
import { FormCanvas } from "@/components/business/forms/FormCanvas";
import { FieldPropertyPanel } from "@/components/business/forms/FieldPropertyPanel";
import { FormResponsesPanel } from "@/components/business/forms/FormResponsesPanel";
import { formBuilderTranslations, type Language } from "./translations";

// ─── Types ───

interface FormItem {
  id: string;
  title: string;
  titleJa: string | null;
  description: string | null;
  descriptionJa: string | null;
  status: string;
  allowMultiple: boolean;
  settings: Record<string, unknown>;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Status helpers ───

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CLOSED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  ARCHIVED: "bg-muted text-muted-foreground",
};

// ─── Main Component ───

export function FormBuilderClient({ language }: { language: Language }) {
  const t = formBuilderTranslations[language];

  // ─── List state ───
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<FormItem | null>(null);

  // ─── Detail state (null = list view) ───
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [previewOpen, setPreviewOpen] = useState(false);
  const { form, isDirty, setForm, markSaved } = useFormBuilderStore();



  // ─── List operations ───

  const loadForms = useCallback(async () => {
    try {
      const res = await fetch("/api/forms");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForms(data.forms ?? []);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t.newForm,
          sections: [{ order: 0, fields: [] }],
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      openEditor(data.form.id);
    } catch {
      toast.error(t.saveError);
    }
  };

  const handlePublish = async (formItem: FormItem) => {
    try {
      const res = await fetch(`/api/forms/${formItem.id}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(formItem.status === "DRAFT" ? t.published : t.closed);
      loadForms();
    } catch {
      toast.error(t.publishError);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/forms/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(t.deleted);
      setDeleteTarget(null);
      loadForms();
    } catch {
      toast.error(t.deleteError);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: t.statusDraft,
      PUBLISHED: t.statusPublished,
      CLOSED: t.statusClosed,
      ARCHIVED: t.statusArchived,
    };
    return map[status] ?? status;
  };

  // ─── Detail operations ───

  const openEditor = useCallback(
    async (formId: string, tab?: string) => {
      setSelectedFormId(formId);
      setDetailLoading(true);
      setActiveTab(tab ?? "editor");
      try {
        const res = await fetch(`/api/forms/${formId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const f = data.form;
        setForm({
          id: f.id,
          title: f.title,
          titleJa: f.titleJa,
          description: f.description,
          descriptionJa: f.descriptionJa,
          status: f.status,
          allowMultiple: f.allowMultiple,
          settings: f.settings ?? {},
          sections: f.sections.map(
            (s: FormSectionDraft & { id: string }) => ({
              id: s.id,
              title: s.title,
              titleJa: s.titleJa,
              description: s.description,
              order: s.order,
              fields: s.fields ?? [],
            }),
          ),
        });
      } catch {
        toast.error(t.loadError);
        setSelectedFormId(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [setForm, t.loadError],
  );

  const handleBack = useCallback(() => {
    setSelectedFormId(null);
    setForm(null as never);
    loadForms();
  }, [setForm, loadForms]);

  const hasOptions = (type: string) =>
    ["SELECT", "MULTI_SELECT", "RADIO", "CHECKBOX_GROUP"].includes(type);

  const handleSave = useCallback(async () => {
    if (!form || !selectedFormId) return;

    // Pre-save validation warnings
    const allFields = form.sections.flatMap((s) => s.fields);
    if (allFields.length === 0) {
      toast.warning(t.noFieldsWarning);
    }
    const emptyOptions = allFields.some(
      (f) => hasOptions(f.type) && (!f.config?.options || (f.config.options as string[]).length === 0),
    );
    if (emptyOptions) {
      toast.warning(t.emptyOptionsWarning);
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/forms/${selectedFormId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.messageJa || errData?.error || "Save failed");
      }
      const data = await res.json();
      const f = data.form;
      setForm({
        id: f.id,
        title: f.title,
        titleJa: f.titleJa,
        description: f.description,
        descriptionJa: f.descriptionJa,
        status: f.status,
        allowMultiple: f.allowMultiple,
        settings: f.settings ?? {},
        sections: f.sections.map(
          (s: FormSectionDraft & { id: string }) => ({
            id: s.id,
            title: s.title,
            titleJa: s.titleJa,
            description: s.description,
            order: s.order,
            fields: s.fields ?? [],
          }),
        ),
      });
      markSaved();
      toast.success(t.saved);
    } catch (e) {
      toast.error((e as Error).message || t.saveError);
    } finally {
      setSaving(false);
    }
  }, [form, selectedFormId, markSaved, setForm, t.saved, t.saveError, t.noFieldsWarning, t.emptyOptionsWarning]);

  // Cmd+S / Ctrl+S save shortcut
  useEffect(() => {
    if (!selectedFormId) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedFormId, handleSave]);

  const handleEditorPublish = async () => {
    if (!selectedFormId || !form) return;

    // Block publish if no fields
    const allFields = form.sections.flatMap((s) => s.fields);
    if (allFields.length === 0) {
      toast.error(t.noFieldsPublishError);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${selectedFormId}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(form?.status === "DRAFT" ? t.published : t.closed);
      openEditor(selectedFormId, activeTab);
    } catch {
      toast.error(t.publishError);
    }
  };

  const handleUnpublish = async () => {
    if (!selectedFormId) return;
    try {
      const res = await fetch(`/api/forms/${selectedFormId}/unpublish`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.messageJa || "Unpublish failed");
      }
      toast.success(t.unpublished);
      openEditor(selectedFormId, activeTab);
    } catch (e) {
      toast.error((e as Error).message || t.unpublishError);
    }
  };

  // ─── Render: Loading (list) ───
  if (loading)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );

  // ─── Render: Detail view ───
  if (selectedFormId) {
    if (detailLoading || !form)
      return (
        <div className="flex flex-col h-[calc(100vh-128px)] overflow-hidden">
          {/* Header: BackButton + title + buttons */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-2 mt-4 shrink-0">
            <Skeleton className="h-9 w-16 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
          {/* 3-column editor */}
          <div className="grid grid-cols-[200px_1fr_260px] gap-3 mt-4 flex-1 min-h-0">
            {/* Left: Field palette */}
            <div className="space-y-4 overflow-hidden">
              <Skeleton className="h-5 w-20" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={`basic-${i}`} className="h-8 w-full rounded-md" />
                ))}
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={`sel-${i}`} className="h-8 w-full rounded-md" />
                ))}
              </div>
            </div>
            {/* Center: Canvas */}
            <div className="space-y-4 overflow-hidden">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-32" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </CardContent>
              </Card>
            </div>
            {/* Right: Property panel */}
            <div className="space-y-3 overflow-hidden">
              <Card>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );

    return (
      <div className="flex flex-col h-[calc(100vh-128px)] overflow-hidden">
        {/* Header with BackButton */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <BackButton onClick={handleBack} />
            <div>
              <h2 className="text-lg font-semibold">
                {form.titleJa || form.title}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={statusColors[form.status] ?? ""}>
                  {getStatusLabel(form.status)}
                </Badge>
                {isDirty && (
                  <span className="text-xs text-muted-foreground">
                    ({t.unsavedChanges})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              {t.preview}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || !isDirty}
              loading={saving}
              shortcut="Mod+S"
            >
              {saving ? t.saving : t.save}
            </Button>
            {form.status === "DRAFT" && (
              <Button size="sm" onClick={handleEditorPublish}>
                {t.publish}
              </Button>
            )}
            {form.status === "PUBLISHED" && (
              <>
                <Button size="sm" variant="ghost" onClick={handleUnpublish}>
                  {t.unpublish}
                </Button>
                <Button size="sm" variant="outline" onClick={handleEditorPublish}>
                  {t.close}
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 mt-4">
          <TabsList className="shrink-0">
            <TabsTrigger value="editor">{t.edit}</TabsTrigger>
            <TabsTrigger value="responses">{t.responsesTitle}</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 min-h-0 mt-4">
            <div className="grid grid-cols-[200px_1fr_260px] gap-3 h-full overflow-hidden">
              <div className="min-w-0 overflow-y-auto">
                <FieldPalette language={language} />
              </div>
              <div className="min-w-0 overflow-y-auto">
                <FormCanvas language={language} />
              </div>
              <div className="min-w-0 overflow-y-auto">
                <FieldPropertyPanel language={language} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="responses" className="flex-1 min-h-0 mt-4 overflow-y-auto">
            <FormResponsesPanel formId={selectedFormId} language={language} />
          </TabsContent>
        </Tabs>

        <FormPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          form={form}
          language={language}
        />
      </div>
    );
  }

  // ─── Render: List view ───
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        <Button onClick={handleCreate}>{t.newForm}</Button>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          message={t.noForms}
          description={t.noFormsDescription}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((formItem) => (
            <Card
              key={formItem.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openEditor(formItem.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">
                    {formItem.titleJa || formItem.title}
                  </CardTitle>
                  <Badge className={statusColors[formItem.status] ?? ""}>
                    {getStatusLabel(formItem.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {t.responses}: {formItem.responseCount}
                  </span>
                  <span>
                    {new Date(formItem.updatedAt).toLocaleDateString(
                      "ja-JP",
                    )}
                  </span>
                </div>
                <div
                  className="flex gap-2 mt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {formItem.status === "DRAFT" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePublish(formItem)}
                    >
                      {t.publish}
                    </Button>
                  )}
                  {formItem.status === "PUBLISHED" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditor(formItem.id, "responses")}
                      >
                        {t.viewResponses}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublish(formItem)}
                      >
                        {t.close}
                      </Button>
                    </>
                  )}
                  {(formItem.status === "DRAFT" ||
                    formItem.status === "CLOSED") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(formItem)}
                    >
                      {t.delete}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDelete={handleDelete}
        title={t.deleteTitle}
        description={t.deleteDescription}
      />
    </div>
  );
}
