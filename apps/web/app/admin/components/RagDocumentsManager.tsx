"use client";

import { Database, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";

interface RagDocument {
  filename: string;
  file_type: string;
  chunk_count: number;
  upload_timestamp: string;
  total_chars: number;
  user_id?: string;
}

interface RagStats {
  total_chunks: number;
  unique_documents: number;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  similarity_threshold: number;
}

interface RagDocumentsManagerProps {
  language: "en" | "ja";
}

function formatFileSize(chars: number): string {
  const bytes = chars; // approximate
  if (bytes < 1024) return `${bytes} chars`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K chars`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M chars`;
}

export function RagDocumentsManager({
  language,
}: RagDocumentsManagerProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [stats, setStats] = useState<RagStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<RagDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const [docRes, statsRes] = await Promise.all([
        fetch("/api/admin/rag-documents"),
        fetch("/api/admin/rag-documents/stats"),
      ]);

      if (!docRes.ok || !statsRes.ok) {
        setBackendAvailable(false);
        return;
      }

      setBackendAvailable(true);
      const docData = await docRes.json();
      const statsData = await statsRes.json();
      setDocuments(docData.documents || []);
      setStats(statsData);
    } catch {
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/rag-documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload");
      }

      fetchDocuments();
    } catch (error) {
      console.error("Error uploading RAG document:", error);
      alert(
        t(
          "Failed to upload document",
          "ドキュメントのアップロードに失敗しました",
        ),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(
        `/api/admin/rag-documents/${encodeURIComponent(docToDelete.filename)}`,
        { method: "DELETE" },
      );
      if (response.ok) {
        setShowDeleteModal(false);
        setDocToDelete(null);
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error deleting RAG document:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">
          {t("RAG Documents", "RAGドキュメント")}
        </h3>
        {backendAvailable && (
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-1" />
            {uploading
              ? t("Uploading...", "アップロード中...")
              : t("Upload", "アップロード")}
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      )}

      {!loading && backendAvailable === false && (
        <EmptyState
          icon={
            <Database className="w-10 h-10 text-muted-foreground/50" />
          }
          message={t(
            "RAG backend is not available",
            "RAGバックエンドが起動していません",
          )}
          description={t(
            "Start the RAG backend with: docker compose up -d airag-backend",
            "以下のコマンドでRAGバックエンドを起動してください: docker compose up -d airag-backend",
          )}
        />
      )}

      {!loading && backendAvailable && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-background rounded-lg text-center">
                <div className="text-lg font-semibold">
                  {stats.unique_documents}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("Documents", "ドキュメント")}
                </div>
              </div>
              <div className="p-3 bg-background rounded-lg text-center">
                <div className="text-lg font-semibold">
                  {stats.total_chunks}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("Chunks", "チャンク")}
                </div>
              </div>
              <div className="p-3 bg-background rounded-lg text-center">
                <div className="text-lg font-semibold text-xs leading-6">
                  {stats.embedding_model.split("/").pop()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("Model", "モデル")}
                </div>
              </div>
              <div className="p-3 bg-background rounded-lg text-center">
                <div className="text-lg font-semibold">
                  {stats.chunk_size}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("Chunk Size", "チャンクサイズ")}
                </div>
              </div>
            </div>
          )}

          {/* Document list */}
          {documents.length === 0 ? (
            <EmptyState
              icon={
                <Database className="w-10 h-10 text-muted-foreground/50" />
              }
              message={t(
                "No documents uploaded",
                "ドキュメントがありません",
              )}
              description={t(
                "Upload .txt, .md, .pdf, or .json files for RAG search",
                ".txt, .md, .pdf, .json ファイルをアップロードしてRAG検索を利用できます",
              )}
            />
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.filename}
                  className="p-4 bg-muted rounded-lg flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                    <Database className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {doc.filename}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {doc.file_type}
                      </Badge>
                      {doc.user_id && (
                        <Badge
                          variant={doc.user_id === "shared" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {doc.user_id === "shared"
                            ? t("Shared", "共有")
                            : t("Personal", "個人")}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-x-3">
                      <span>
                        {doc.chunk_count}{" "}
                        {t("chunks", "チャンク")}
                      </span>
                      <span>{formatFileSize(doc.total_chars)}</span>
                      {doc.upload_timestamp && (
                        <span>
                          {new Date(doc.upload_timestamp).toLocaleDateString(
                            language === "ja" ? "ja-JP" : "en-US",
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
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
        </>
      )}

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title={t("Delete RAG Document", "RAGドキュメント削除")}
        description={t(
          `Are you sure you want to delete "${docToDelete?.filename}"? All associated chunks will be removed.`,
          `「${docToDelete?.filename}」を削除してもよろしいですか？関連するすべてのチャンクが削除されます。`,
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
