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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPreviewDialog } from "@/components/business/forms/FormPreviewDialog";
import { Badge } from "@/components/ui/badge";
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

type ViewMode = "list" | "editor" | "responses";

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

  // ─── Navigation state ───
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  // ─── List state ───
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<FormItem | null>(null);
  const [closeTarget, setCloseTarget] = useState<FormItem | null>(null);
  const [unpublishConfirmOpen, setUnpublishConfirmOpen] = useState(false);

  // ─── Editor state ───
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { form, isDirty, setForm, markSaved } = useFormBuilderStore();

  // ─── Responses state ───
  const [responsesFormInfo, setResponsesFormInfo] = useState<{
    title: string;
    status: string;
  } | null>(null);

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
    if (formItem.status === "PUBLISHED") {
      setCloseTarget(formItem);
      return;
    }
    try {
      const res = await fetch(`/api/forms/${formItem.id}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(t.published);
      loadForms();
    } catch {
      toast.error(t.publishError);
    }
  };

  const handleClose = async () => {
    if (!closeTarget) return;
    const closingId = closeTarget.id;
    try {
      const res = await fetch(`/api/forms/${closingId}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(t.closed);
      setCloseTarget(null);
      if (selectedFormId === closingId && viewMode === "editor") {
        openEditor(closingId);
      } else {
        loadForms();
      }
    } catch {
      toast.error(t.publishError);
      setCloseTarget(null);
    }
  };

  const handleReopen = async (formItem: FormItem) => {
    try {
      const res = await fetch(`/api/forms/${formItem.id}/reopen`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(t.reopened);
      loadForms();
    } catch {
      toast.error(t.reopenError);
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

  // ─── Navigation ───

  const openEditor = useCallback(
    async (formId: string) => {
      setSelectedFormId(formId);
      setViewMode("editor");
      setDetailLoading(true);
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
        setViewMode("list");
        setSelectedFormId(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [setForm, t.loadError],
  );

  const openResponses = useCallback(
    async (formId: string, title: string, status: string) => {
      setSelectedFormId(formId);
      setResponsesFormInfo({ title, status });
      setViewMode("responses");
    },
    [],
  );

  const handleBackToList = useCallback(() => {
    setSelectedFormId(null);
    setViewMode("list");
    setForm(null as never);
    setResponsesFormInfo(null);
    loadForms();
  }, [setForm, loadForms]);

  // ─── Editor operations ───

  const hasOptions = (type: string) =>
    ["SELECT", "MULTI_SELECT", "RADIO", "CHECKBOX_GROUP"].includes(type);

  const handleSave = useCallback(async () => {
    if (!form || !selectedFormId) return;

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

  // Cmd+S / Ctrl+S save shortcut (DRAFT only)
  useEffect(() => {
    if (viewMode !== "editor" || !selectedFormId || form?.status !== "DRAFT") return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewMode, selectedFormId, form?.status, handleSave]);

  const handleEditorPublish = async () => {
    if (!selectedFormId || !form) return;

    const allFields = form.sections.flatMap((s) => s.fields);
    if (allFields.length === 0) {
      toast.error(t.noFieldsPublishError);
      return;
    }

    if (form.status === "PUBLISHED") {
      setCloseTarget({
        id: selectedFormId,
        title: form.title,
        titleJa: form.titleJa ?? null,
        description: form.description ?? null,
        descriptionJa: form.descriptionJa ?? null,
        status: form.status,
        allowMultiple: form.allowMultiple,
        settings: form.settings,
        responseCount: 0,
        createdAt: "",
        updatedAt: "",
      });
      return;
    }

    try {
      const res = await fetch(`/api/forms/${selectedFormId}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(t.published);
      openEditor(selectedFormId);
    } catch {
      toast.error(t.publishError);
    }
  };

  const handleEditorReopen = async () => {
    if (!selectedFormId) return;
    try {
      const res = await fetch(`/api/forms/${selectedFormId}/reopen`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(t.reopened);
      openEditor(selectedFormId);
    } catch {
      toast.error(t.reopenError);
    }
  };

  const handleUnpublish = () => {
    setUnpublishConfirmOpen(true);
  };

  const executeUnpublish = async () => {
    if (!selectedFormId) return;
    setUnpublishConfirmOpen(false);
    try {
      const res = await fetch(`/api/forms/${selectedFormId}/unpublish`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.messageJa || "Unpublish failed");
      }
      const data = await res.json();
      if (data.notifiedUsers > 0) {
        toast.success(`${t.unpublished} ${data.notifiedUsers}${t.unpublishNotified}`);
      } else {
        toast.success(t.unpublished);
      }
      openEditor(selectedFormId);
    } catch (e) {
      toast.error((e as Error).message || t.unpublishError);
    }
  };

  // ─── Close confirmation dialog (shared across views) ───
  const closeConfirmDialog = (
    <AlertDialog
      open={!!closeTarget}
      onOpenChange={(open) => !open && setCloseTarget(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.closeTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.closeDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleClose}>
            {t.closeConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ─── Render: Loading (list) ───
  if (loading && viewMode === "list")
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

  // ═══════════════════════════════════════
  // ─── View 2: Editor ───
  // ═══════════════════════════════════════
  if (viewMode === "editor" && selectedFormId) {
    if (detailLoading || !form)
      return (
        <div className="flex flex-col h-[calc(100vh-128px)] overflow-hidden">
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
          <div className="grid grid-cols-[200px_1fr_260px] gap-3 mt-4 flex-1 min-h-0">
            <div className="space-y-4 overflow-hidden">
              <Skeleton className="h-5 w-20" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
            <div className="space-y-4 overflow-hidden">
              <Card><CardContent className="p-4 space-y-4">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </CardContent></Card>
            </div>
            <div className="space-y-3 overflow-hidden">
              <Card><CardContent className="p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent></Card>
            </div>
          </div>
        </div>
      );

    return (
      <div className="flex flex-col h-[calc(100vh-128px)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <BackButton onClick={handleBackToList} />
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
            {form.status === "DRAFT" && (
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
            )}
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
            {form.status === "CLOSED" && (
              <Button size="sm" onClick={handleEditorReopen}>
                {t.reopen}
              </Button>
            )}
          </div>
        </div>

        {/* Editor content */}
        <div className="flex-1 min-h-0 mt-4">
          {form.status === "DRAFT" ? (
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
          ) : (
            <div className="h-full overflow-y-auto">
              <FormCanvas language={language} readOnly />
            </div>
          )}
        </div>

        <FormPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          form={form}
          language={language}
        />

        {closeConfirmDialog}

        <AlertDialog
          open={unpublishConfirmOpen}
          onOpenChange={setUnpublishConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.unpublishTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.unpublishDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={executeUnpublish}>
                {t.unpublishConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ─── View 3: Responses ───
  // ═══════════════════════════════════════
  if (viewMode === "responses" && selectedFormId) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <BackButton onClick={handleBackToList} />
          <div>
            <h2 className="text-lg font-semibold">
              {responsesFormInfo?.title ?? ""}
            </h2>
            {responsesFormInfo?.status && (
              <Badge className={statusColors[responsesFormInfo.status] ?? ""}>
                {getStatusLabel(responsesFormInfo.status)}
              </Badge>
            )}
          </div>
        </div>

        {/* Responses panel */}
        <FormResponsesPanel formId={selectedFormId} language={language} />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ─── View 1: List ───
  // ═══════════════════════════════════════
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
                    {new Date(formItem.updatedAt).toLocaleDateString("ja-JP")}
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
                        onClick={() =>
                          openResponses(
                            formItem.id,
                            formItem.titleJa || formItem.title,
                            formItem.status,
                          )
                        }
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
                  {formItem.status === "CLOSED" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          openResponses(
                            formItem.id,
                            formItem.titleJa || formItem.title,
                            formItem.status,
                          )
                        }
                      >
                        {t.viewResponses}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReopen(formItem)}
                      >
                        {t.reopen}
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

      {closeConfirmDialog}
    </div>
  );
}
