"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileText, ExternalLink, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";
import dynamic from "next/dynamic";
import { editorTranslations, type Language } from "./translations";

const FloatingEditorContent = dynamic(
  () => import("@/components/business/editor/FloatingEditorContent"),
  { ssr: false },
);

interface DocItem {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export function EditorClient({ language }: { language: Language }) {
  const t = editorTranslations[language];
  const floatingWindow = useFloatingWindowStore();

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ドキュメント一覧を取得
  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/editor");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocuments(data.documents ?? []);
      return data.documents ?? [];
    } catch {
      toast.error(t.loadError);
      return [];
    }
  }, [t.loadError]);

  // 初期化
  useEffect(() => {
    (async () => {
      await loadDocuments();
      setMounted(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // リネーム開始
  const startRename = useCallback((doc: DocItem) => {
    setRenamingId(doc.id);
    setRenameValue(doc.title);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }, []);

  // リネーム確定
  const confirmRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const trimmed = renameValue.trim();
    try {
      await fetch(`/api/editor/${renamingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === renamingId
            ? { ...d, title: trimmed, updatedAt: new Date().toISOString() }
            : d,
        ),
      );
    } catch {
      toast.error(t.loadError);
    }
    setRenamingId(null);
  }, [renamingId, renameValue, t.loadError]);

  // リネームキャンセル
  const cancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  // フローティングウィンドウでドキュメントを開く
  const openInFloatingWindow = useCallback(
    (doc: DocItem) => {
      floatingWindow.open({
        title: doc.title,
        titleJa: doc.title,
        content: (
          <FloatingEditorContent docId={doc.id} />
        ),
        initialSize: { width: 900, height: 600 },
        initialPosition: { x: 150, y: 80 },
        noPadding: true,
      });
    },
    [floatingWindow],
  );

  // 新規作成してフローティングウィンドウで開く
  const handleCreate = useCallback(async () => {
    try {
      const res = await fetch("/api/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t.untitled }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newDoc: DocItem = {
        id: data.document.id,
        title: data.document.title,
        updatedAt: data.document.updatedAt,
        createdAt: data.document.createdAt ?? data.document.updatedAt,
      };
      setDocuments((prev) => [newDoc, ...prev]);
      openInFloatingWindow(newDoc);
    } catch {
      toast.error(t.loadError);
    }
  }, [t.untitled, t.loadError, openInFloatingWindow]);

  // 削除
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/editor/${deleteTarget}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget));
      // フローティングウィンドウで開いている場合は閉じる
      if (floatingWindow.windowStatus !== "closed") {
        floatingWindow.close();
      }
      setDeleteTarget(null);
    } catch {
      toast.error(t.loadError);
    }
  }, [deleteTarget, floatingWindow, t.loadError]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)] text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {documents.length}{t.documentCount}
          </span>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t.newDocument}
        </Button>
      </div>

      {/* ドキュメント一覧 */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-1">{t.noDocuments}</p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            {t.noDocumentsDescription}
          </p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t.newDocument}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => {
                if (renamingId !== doc.id) openInFloatingWindow(doc);
              }}
            >
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                {renamingId === doc.id ? (
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      className="flex-1 text-sm font-medium bg-background border border-primary rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:text-primary"
                      onClick={confirmRename}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={cancelRename}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium text-foreground truncate">
                      {doc.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.lastUpdated}: {formatDate(doc.updatedAt)}
                    </div>
                  </>
                )}
              </div>
              {renamingId !== doc.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(doc);
                    }}
                    title={t.rename}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInFloatingWindow(doc);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(doc.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t.deleteTitle}
        description={t.deleteDescription}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        onDelete={handleDelete}
      />
    </div>
  );
}
