"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import "@/components/business/editor/editor.css";

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

interface FloatingEditorContentProps {
  docId: string;
}

export default function FloatingEditorContent({
  docId,
}: FloatingEditorContentProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // スクロール同期用
  const editorScrollRef = useRef<HTMLElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollSourceRef = useRef<"editor" | "preview" | null>(null);

  // ドキュメント読み込み
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/editor/${docId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setContent(data.document.content);
        setTitle(data.document.title);
        setLoaded(true);
      } catch {
        toast.error("読み込みに失敗しました");
      }
    })();
  }, [docId]);

  // コンテンツ変更（自動保存 — タイトルは変更しない）
  const handleChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fetch(`/api/editor/${docId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: newContent }),
          });
        } catch {
          // サイレント失敗
        } finally {
          setSaving(false);
        }
      }, 500);
    },
    [docId],
  );

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
        if (maxFrom <= 0) {
          scrollSourceRef.current = null;
          return;
        }
        const ratio = from.scrollTop / maxFrom;
        const maxTo = to.scrollHeight - to.clientHeight;
        to.scrollTop = ratio * maxTo;
        requestAnimationFrame(() => {
          scrollSourceRef.current = null;
        });
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
  }, [viewMode]);

  const handleEditorScrollDom = useCallback((el: HTMLElement | null) => {
    editorScrollRef.current = el;
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  const showPreview = viewMode === "split";
  const isLivePreview = viewMode === "live";

  return (
    <div className="editor-wrapper flex flex-col h-full">
      <EditorToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        title={title}
        showSidebarToggle={false}
      />

      <div className={`editor-content ${showPreview ? "split" : ""}`}>
        <div className="editor-pane">
          <CodeMirrorEditor
            docId={docId}
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

      {/* 保存ステータス */}
      <div className="absolute bottom-7 right-3 text-[10px] text-muted-foreground">
        {saving ? "保存中..." : ""}
      </div>
    </div>
  );
}
