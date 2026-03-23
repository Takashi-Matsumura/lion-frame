"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileText, ExternalLink, Pencil, Check, X, PenTool, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";
import dynamic from "next/dynamic";
import { editorTranslations, type Language } from "./translations";

const FloatingEditorContent = dynamic(
  () => import("@/components/business/editor/FloatingEditorContent"),
  { ssr: false },
);

type DocType = "markdown" | "excalidraw";

interface DocItem {
  id: string;
  title: string;
  type: DocType;
  updatedAt: string;
  createdAt: string;
}

const DOC_TYPE_ICON: Record<DocType, typeof FileText> = {
  markdown: FileText,
  excalidraw: PenTool,
};

const DEFAULT_WINDOW_SIZE: Record<DocType, { width: number; height: number }> = {
  markdown: { width: 900, height: 600 },
  excalidraw: { width: 1100, height: 700 },
};

export function EditorClient({ language }: { language: Language }) {
  const t = editorTranslations[language];
  const floatingWindow = useFloatingWindowStore();

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    (async () => {
      await loadDocuments();
      setMounted(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRename = useCallback((doc: DocItem) => {
    setRenamingId(doc.id);
    setRenameValue(doc.title);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }, []);

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

  const cancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  const openInFloatingWindow = useCallback(
    (doc: DocItem) => {
      const docType = (doc.type ?? "markdown") as DocType;
      floatingWindow.open({
        title: doc.title,
        titleJa: doc.title,
        content: (
          <FloatingEditorContent docId={doc.id} docType={docType} />
        ),
        initialSize: DEFAULT_WINDOW_SIZE[docType],
        initialPosition: { x: 150, y: 80 },
        noPadding: true,
      });
    },
    [floatingWindow],
  );

  const handleCreate = useCallback(async (type: DocType) => {
    try {
      const res = await fetch("/api/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t.untitled, type }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newDoc: DocItem = {
        id: data.document.id,
        title: data.document.title,
        type: data.document.type ?? type,
        updatedAt: data.document.updatedAt,
        createdAt: data.document.createdAt ?? data.document.updatedAt,
      };
      setDocuments((prev) => [newDoc, ...prev]);
      openInFloatingWindow(newDoc);
    } catch {
      toast.error(t.loadError);
    }
  }, [t.untitled, t.loadError, openInFloatingWindow]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/editor/${deleteTarget}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget));
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.newDocument}
              <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCreate("markdown")}>
              <FileText className="h-4 w-4 mr-2" />
              {t.newMarkdown}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreate("excalidraw")}>
              <PenTool className="h-4 w-4 mr-2" />
              {t.newWhiteboard}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ドキュメント一覧 */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-1">{t.noDocuments}</p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            {t.noDocumentsDescription}
          </p>
          <Button onClick={() => handleCreate("markdown")}>
            <Plus className="h-4 w-4 mr-2" />
            {t.newDocument}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const docType = (doc.type ?? "markdown") as DocType;
            const Icon = DOC_TYPE_ICON[docType] ?? FileText;
            return (
              <div
                key={doc.id}
                className="group flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => {
                  if (renamingId !== doc.id) openInFloatingWindow(doc);
                }}
              >
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
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
            );
          })}
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
