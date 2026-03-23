"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import "@/components/business/editor/editor.css";

const CodeMirrorEditor = dynamic(
  () => import("@/components/business/editor/CodeMirrorEditor"),
  { ssr: false },
);
const ExcalidrawEditor = dynamic(
  () => import("@/components/business/editor/ExcalidrawEditor"),
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
type DocType = "markdown" | "excalidraw";

const SAVE_DEBOUNCE: Record<DocType, number> = {
  markdown: 500,
  excalidraw: 1000,
};

interface FloatingEditorContentProps {
  docId: string;
  docType?: DocType;
}

export default function FloatingEditorContent({
  docId,
  docType: initialDocType,
}: FloatingEditorContentProps) {
  const [content, setContent] = useState("");
  const [docType, setDocType] = useState<DocType>(initialDocType ?? "markdown");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { resolvedTheme } = useTheme();

  const appTheme = (resolvedTheme ?? "light") as "light" | "dark";

  // next-themes の resolvedTheme はクライアント初回レンダリング後に確定する
  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/editor/${docId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setContent(data.document.content);
        setDocType(data.document.type ?? "markdown");
        setLoaded(true);
      } catch {
        toast.error("読み込みに失敗しました");
      }
    })();
  }, [docId]);

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
      }, SAVE_DEBOUNCE[docType]);
    },
    [docId, docType],
  );

  if (!loaded || !themeMounted) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  // Excalidraw: 全面表示（独自ツールバーなし）
  if (docType === "excalidraw") {
    return (
      <div className="flex flex-col h-full">
        <ExcalidrawEditor
          initialData={content}
          onChange={handleChange}
          theme={appTheme}
        />
        {saving && (
          <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
            保存中...
          </div>
        )}
      </div>
    );
  }

  // Markdown: 既存のToolbar + CodeMirror + Footer
  return (
    <div className="editor-wrapper flex flex-col h-full" data-theme={appTheme}>
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

      <div className="absolute bottom-7 right-3 text-[10px] text-muted-foreground">
        {saving ? "保存中..." : ""}
      </div>
    </div>
  );
}
