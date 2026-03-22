"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Menu } from "lucide-react";
import { Button } from "@/components/ui";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import dynamic from "next/dynamic";
import "@/components/business/editor/editor.css";
import { editorTranslations, type Language } from "./translations";

// CodeMirrorはSSRで動かないのでdynamic import
const CodeMirrorEditor = dynamic(
  () => import("@/components/business/editor/CodeMirrorEditor"),
  { ssr: false },
);
const MarkdownPreview = dynamic(
  () => import("@/components/business/editor/MarkdownPreview"),
  { ssr: false },
);
const EditorToolbar = dynamic(
  () => import("@/components/business/editor/EditorToolbar"),
  { ssr: false },
);
const ShortcutFooter = dynamic(
  () => import("@/components/business/editor/ShortcutFooter"),
  { ssr: false },
);

type ViewMode = "live" | "source" | "split";

interface DocItem {
  id: string;
  title: string;
  updatedAt: string;
}

export function EditorClient({ language }: { language: Language }) {
  const t = editorTranslations[language];

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // スクロール同期用
  const editorScrollRef = useRef<HTMLElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollSourceRef = useRef<"editor" | "preview" | null>(null);

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
      const docs = await loadDocuments();
      if (docs.length > 0) {
        await selectDocument(docs[0].id);
      }
      setMounted(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ドキュメント選択
  const selectDocument = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/editor/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActiveId(id);
      setContent(data.document.content);
    } catch {
      toast.error(t.loadError);
    }
  }, [t.loadError]);

  // コンテンツ変更（自動保存）
  const handleChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!activeId) return;
        setSaving(true);
        try {
          const title = extractTitle(newContent);
          await fetch(`/api/editor/${activeId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: newContent, title }),
          });
          // ドキュメント一覧のタイトルを更新
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === activeId ? { ...d, title, updatedAt: new Date().toISOString() } : d,
            ),
          );
        } catch {
          // サイレント失敗
        } finally {
          setSaving(false);
        }
      }, 500);
    },
    [activeId],
  );

  // 新規作成
  const handleCreate = useCallback(async () => {
    try {
      const res = await fetch("/api/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t.untitled }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocuments((prev) => [
        { id: data.document.id, title: data.document.title, updatedAt: data.document.updatedAt },
        ...prev,
      ]);
      setActiveId(data.document.id);
      setContent("");
    } catch {
      toast.error(t.loadError);
    }
  }, [t.untitled, t.loadError]);

  // 削除
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/editor/${deleteTarget}`, { method: "DELETE" });
      const remaining = documents.filter((d) => d.id !== deleteTarget);
      setDocuments(remaining);
      if (deleteTarget === activeId) {
        if (remaining.length > 0) {
          await selectDocument(remaining[0].id);
        } else {
          setActiveId(null);
          setContent("");
        }
      }
      setDeleteTarget(null);
    } catch {
      toast.error(t.loadError);
    }
  }, [deleteTarget, documents, activeId, selectDocument, t.loadError]);

  // スクロール同期
  useEffect(() => {
    const editorEl = editorScrollRef.current;
    const previewEl = previewScrollRef.current;
    if (!editorEl || !previewEl) return;

    let rafId: number | null = null;

    const syncScroll = (source: "editor" | "preview") => {
      if (scrollSourceRef.current && scrollSourceRef.current !== source) return;
      scrollSourceRef.current = source;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const from = source === "editor" ? editorEl : previewEl;
        const to = source === "editor" ? previewEl : editorEl;
        const maxFrom = from.scrollHeight - from.clientHeight;
        if (maxFrom <= 0) { scrollSourceRef.current = null; return; }
        const ratio = from.scrollTop / maxFrom;
        const maxTo = to.scrollHeight - to.clientHeight;
        to.scrollTop = ratio * maxTo;
        requestAnimationFrame(() => { scrollSourceRef.current = null; });
      });
    };

    const onEditorScroll = () => syncScroll("editor");
    const onPreviewScroll = () => syncScroll("preview");

    editorEl.addEventListener("scroll", onEditorScroll, { passive: true });
    previewEl.addEventListener("scroll", onPreviewScroll, { passive: true });

    return () => {
      editorEl.removeEventListener("scroll", onEditorScroll);
      previewEl.removeEventListener("scroll", onPreviewScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [viewMode, activeId]);

  const handleEditorScrollDom = useCallback((el: HTMLElement | null) => {
    editorScrollRef.current = el;
  }, []);

  if (!mounted) {
    return <div className="flex items-center justify-center h-[calc(100vh-200px)] text-muted-foreground text-sm">読み込み中...</div>;
  }

  const showPreview = viewMode === "split";
  const isLivePreview = viewMode === "live";

  return (
    <div className="editor-wrapper -mx-4 -mt-8 -mb-8" style={{ height: "calc(100vh - 56px)" }}>
      <div className="flex h-full">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-64 border-r bg-muted/30 flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{t.myDocuments}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {documents.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {t.noDocuments}
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                      doc.id === activeId
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => selectDocument(doc.id)}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{doc.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(doc.updatedAt).toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(doc.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t text-[10px] text-muted-foreground text-center">
              {saving ? t.saving : t.saved}
            </div>
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <EditorToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            theme="light"
            onThemeChange={() => {}}
            title={documents.find((d) => d.id === activeId)?.title ?? t.untitled}
            onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
          />

          {activeId ? (
            <>
              <div className={`editor-content ${showPreview ? "split" : ""}`}>
                <div className="editor-pane">
                  <CodeMirrorEditor
                    docId={activeId}
                    initialDoc={content}
                    onChange={handleChange}
                    livePreview={isLivePreview}
                    readOnly={false}
                    onScrollDom={handleEditorScrollDom}
                  />
                </div>
                {showPreview && (
                  <div className="preview-container" ref={previewScrollRef}>
                    <MarkdownPreview content={content} />
                  </div>
                )}
              </div>
              <ShortcutFooter />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-3">{t.noDocumentsDescription}</p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.newDocument}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

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

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "無題";
}
