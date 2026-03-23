"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import "@/components/business/editor/editor.css";

const CodeMirrorEditor = dynamic(
  () => import("@/components/business/editor/CodeMirrorEditor"),
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

type ViewMode = "live" | "source";

interface FloatingEditorContentProps {
  docId: string;
}

export default function FloatingEditorContent({
  docId,
}: FloatingEditorContentProps) {
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ドキュメント読み込み
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/editor/${docId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setContent(data.document.content);
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

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="editor-wrapper flex flex-col h-full">
      <EditorToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        content={content}
      />

      <div className="editor-content">
        <div className="editor-pane">
          <CodeMirrorEditor
            docId={docId}
            initialDoc={content}
            onChange={handleChange}
            livePreview={viewMode === "live"}
            readOnly={false}
          />
        </div>
      </div>
      <ShortcutFooter />

      {/* 保存ステータス */}
      <div className="absolute bottom-7 right-3 text-[10px] text-muted-foreground">
        {saving ? "保存中..." : ""}
      </div>
    </div>
  );
}
