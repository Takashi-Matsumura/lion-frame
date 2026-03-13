"use client";

import { BookOpen, Edit3, FileText, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  AdminTutorialDocument,
  TutorialDocumentFormState,
} from "@/types/admin";

interface TutorialDocumentsManagerProps {
  language: "en" | "ja";
}

const defaultFormState: TutorialDocumentFormState = {
  title: "",
  titleJa: "",
  description: "",
  descriptionJa: "",
  suggestedPrompts: [{ text: "", textJa: "" }],
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
}

export function TutorialDocumentsManager({
  language,
}: TutorialDocumentsManagerProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  const [documents, setDocuments] = useState<AdminTutorialDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminTutorialDocument | null>(null);
  const [form, setForm] = useState<TutorialDocumentFormState>(defaultFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<AdminTutorialDocument | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/tutorial-documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Error fetching tutorial documents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreate = () => {
    setEditing(null);
    setForm(defaultFormState);
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleEdit = (doc: AdminTutorialDocument) => {
    setEditing(doc);
    setForm({
      title: doc.title,
      titleJa: doc.titleJa || "",
      description: doc.description || "",
      descriptionJa: doc.descriptionJa || "",
      suggestedPrompts:
        doc.suggestedPrompts.length > 0
          ? doc.suggestedPrompts.map((p) => ({
              text: p.text,
              textJa: p.textJa || "",
            }))
          : [{ text: "", textJa: "" }],
    });
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!editing && !selectedFile) return;

    try {
      setSaving(true);

      // おすすめ質問をフィルター（空欄除去）
      const prompts = form.suggestedPrompts.filter(
        (p) => p.text.trim() || p.textJa.trim(),
      );

      if (editing) {
        // 更新
        const formData = new FormData();
        formData.append("title", form.title);
        formData.append("titleJa", form.titleJa);
        formData.append("description", form.description);
        formData.append("descriptionJa", form.descriptionJa);
        formData.append("suggestedPrompts", JSON.stringify(prompts));
        if (selectedFile) {
          formData.append("file", selectedFile);
        }

        const response = await fetch(
          `/api/admin/tutorial-documents/${editing.id}`,
          { method: "PATCH", body: formData },
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update");
        }
      } else {
        // 新規作成
        const formData = new FormData();
        formData.append("file", selectedFile!);
        formData.append("title", form.title);
        formData.append("titleJa", form.titleJa);
        formData.append("description", form.description);
        formData.append("descriptionJa", form.descriptionJa);
        formData.append("suggestedPrompts", JSON.stringify(prompts));

        const response = await fetch("/api/admin/tutorial-documents", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create");
        }
      }

      setShowModal(false);
      fetchDocuments();
    } catch (error) {
      console.error("Error saving tutorial document:", error);
      alert(
        t(
          "Failed to save tutorial document",
          "チュートリアルドキュメントの保存に失敗しました",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(
        `/api/admin/tutorial-documents/${docToDelete.id}`,
        { method: "DELETE" },
      );
      if (response.ok) {
        setShowDeleteModal(false);
        setDocToDelete(null);
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error deleting tutorial document:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleEnabled = async (
    doc: AdminTutorialDocument,
    enabled: boolean,
  ) => {
    try {
      const response = await fetch(
        `/api/admin/tutorial-documents/${doc.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: enabled }),
        },
      );
      if (response.ok) {
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error toggling tutorial document:", error);
    }
  };

  const addPromptRow = () => {
    setForm((prev) => ({
      ...prev,
      suggestedPrompts: [...prev.suggestedPrompts, { text: "", textJa: "" }],
    }));
  };

  const removePromptRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      suggestedPrompts: prev.suggestedPrompts.filter((_, i) => i !== index),
    }));
  };

  const updatePrompt = (
    index: number,
    field: "text" | "textJa",
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      suggestedPrompts: prev.suggestedPrompts.map((p, i) =>
        i === index ? { ...p, [field]: value } : p,
      ),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">
          {t("Tutorial Documents", "チュートリアルドキュメント")}
        </h3>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-1" />
          {t("Add", "追加")}
        </Button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      )}

      {!loading && documents.length === 0 && (
        <EmptyState
          icon={
            <BookOpen className="w-10 h-10 text-muted-foreground/50" />
          }
          message={t(
            "No tutorial documents",
            "チュートリアルドキュメントがありません",
          )}
          description={t(
            "Upload PDF documents for AI tutorial features",
            "AIチュートリアル機能用のPDFドキュメントをアップロードしてください",
          )}
        />
      )}

      {!loading && documents.length > 0 && (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 bg-muted rounded-lg flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {language === "ja" && doc.titleJa ? doc.titleJa : doc.title}
                  </span>
                  <Badge
                    variant={doc.isEnabled ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {doc.isEnabled
                      ? t("Enabled", "有効")
                      : t("Disabled", "無効")}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-x-3">
                  <span>{doc.fileName}</span>
                  <span>{doc.pageCount} {t("pages", "ページ")}</span>
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>~{formatTokenCount(doc.estimatedTokens)} {t("tokens", "トークン")}</span>
                </div>
                {(doc.description || doc.descriptionJa) && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {language === "ja" && doc.descriptionJa
                      ? doc.descriptionJa
                      : doc.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={doc.isEnabled}
                  onCheckedChange={(checked) =>
                    handleToggleEnabled(doc, checked)
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(doc)}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDocToDelete(doc);
                    setShowDeleteModal(true);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 作成/編集ダイアログ */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("Edit Tutorial Document", "チュートリアルドキュメント編集")
                : t(
                    "Add Tutorial Document",
                    "チュートリアルドキュメント追加",
                  )}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? t(
                    "Update the tutorial document details.",
                    "チュートリアルドキュメントの詳細を更新します。",
                  )
                : t(
                    "Upload a PDF document for AI tutorial features.",
                    "AIチュートリアル機能用のPDFドキュメントをアップロードします。",
                  )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* PDF選択 */}
            <div className="space-y-2">
              <Label>{t("PDF File", "PDFファイル")}</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted transition-colors"
              >
                <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                {selectedFile ? (
                  <p className="text-sm">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                ) : editing ? (
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Click to replace PDF (optional)",
                      "クリックしてPDFを差し替え（任意）",
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Click to select a PDF file (max 20MB)",
                      "クリックしてPDFファイルを選択（最大20MB）",
                    )}
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />
            </div>

            {/* タイトル (EN) */}
            <div className="space-y-2">
              <Label>{t("Title (English)", "タイトル（英語）")}</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder={t("e.g. Company Handbook", "例: 社内ハンドブック")}
              />
            </div>

            {/* タイトル (JA) */}
            <div className="space-y-2">
              <Label>{t("Title (Japanese)", "タイトル（日本語）")}</Label>
              <Input
                value={form.titleJa}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, titleJa: e.target.value }))
                }
                placeholder={t("e.g. 社内ハンドブック", "例: 社内ハンドブック")}
              />
            </div>

            {/* 説明 (EN) */}
            <div className="space-y-2">
              <Label>{t("Description (English)", "説明（英語）")}</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            {/* 説明 (JA) */}
            <div className="space-y-2">
              <Label>{t("Description (Japanese)", "説明（日本語）")}</Label>
              <Input
                value={form.descriptionJa}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    descriptionJa: e.target.value,
                  }))
                }
              />
            </div>

            {/* おすすめ質問 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {t("Suggested Prompts", "おすすめ質問")}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addPromptRow}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {t("Add", "追加")}
                </Button>
              </div>
              <div className="space-y-2">
                {form.suggestedPrompts.map((prompt, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={prompt.text}
                        onChange={(e) =>
                          updatePrompt(index, "text", e.target.value)
                        }
                        placeholder={t("English prompt", "英語の質問")}
                        className="text-sm"
                      />
                      <Input
                        value={prompt.textJa}
                        onChange={(e) =>
                          updatePrompt(index, "textJa", e.target.value)
                        }
                        placeholder={t("Japanese prompt", "日本語の質問")}
                        className="text-sm"
                      />
                    </div>
                    {form.suggestedPrompts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePromptRow(index)}
                        className="text-destructive hover:text-destructive mt-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={saving}
            >
              {t("Cancel", "キャンセル")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving || !form.title.trim() || (!editing && !selectedFile)
              }
            >
              {saving
                ? t("Saving...", "保存中...")
                : editing
                  ? t("Save", "保存")
                  : t("Upload", "アップロード")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title={t("Delete Tutorial Document", "チュートリアルドキュメント削除")}
        description={t(
          `Are you sure you want to delete "${docToDelete?.title}"? This action cannot be undone.`,
          `「${docToDelete ? (language === "ja" && docToDelete.titleJa ? docToDelete.titleJa : docToDelete.title) : ""}」を削除してもよろしいですか？この操作は取り消せません。`,
        )}
        cancelLabel={t("Cancel", "キャンセル")}
        deleteLabel={t("Delete", "削除")}
        onDelete={handleDelete}
        disabled={deleting}
        requireConfirmText="DELETE"
        confirmPrompt={t(
          'Type "DELETE" to confirm:',
          '確認のため「DELETE」と入力してください:',
        )}
      />
    </div>
  );
}
