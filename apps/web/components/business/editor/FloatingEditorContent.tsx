"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { type DocType, type ViewMode, SAVE_DEBOUNCE } from "@/components/business/editor/types";
import type { CodeMirrorEditorHandle } from "@/components/business/editor/CodeMirrorEditor";
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
const EditorAIPanel = dynamic(
  () => import("@/components/business/editor/EditorAIPanel"),
  { ssr: false },
);

interface FloatingEditorContentProps {
  docId: string;
  docType?: DocType;
  readOnly?: boolean;
}

interface AIRequest {
  action: string;
  selectedText?: string;
  selectionRange?: { from: number; to: number };
}

export default function FloatingEditorContent({
  docId,
  docType: initialDocType,
  readOnly = false,
}: FloatingEditorContentProps) {
  const [content, setContent] = useState("");
  const [docType, setDocType] = useState<DocType>(initialDocType ?? "markdown");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);
  const [aiPendingRequest, setAiPendingRequest] = useState<AIRequest | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<CodeMirrorEditorHandle>(null);
  const { resolvedTheme } = useTheme();

  const appTheme = (resolvedTheme ?? "light") as "light" | "dark";

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
      if (readOnly) return;
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
    [docId, docType, readOnly],
  );

  // アンマウント時に保存タイマーをクリア
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // AI利用可否チェック
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ai/chat");
        if (res.ok) {
          const data = await res.json();
          setAiEnabled(data.available === true);
        }
      } catch {
        // AI利用不可
      }
    })();
  }, []);

  // AIパネルへのリクエスト送信
  const handleAIRequest = useCallback((req: AIRequest) => {
    setAiPanelExpanded(true);
    setAiPendingRequest(req);
  }, []);

  // 閲覧モード: Escキーでエディタのフォーカスを外してプレビューに戻す
  useEffect(() => {
    if (!readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        editorRef.current?.clearFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readOnly]);

  if (!loaded || !resolvedTheme) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

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

  return (
    <div className="editor-wrapper flex flex-col h-full" data-theme={appTheme}>
      {readOnly ? (
        <button
          type="button"
          className="flex items-center justify-between w-full px-3 py-1.5 border-b bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
          onClick={() => {
            editorRef.current?.clearFocus();
          }}
        >
          <span>閲覧モード — このドキュメントは読み取り専用です（クリックでプレビューに戻る）</span>
          <kbd className="ml-2 px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-800/40 text-[10px] font-mono">Esc</kbd>
        </button>
      ) : (
        <EditorToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          content={content}
          onMediaInsert={(markdown) => {
            const newContent = content + markdown;
            setContent(newContent);
            handleChange(newContent);
          }}
          aiEnabled={aiEnabled}
          onAIRequest={handleAIRequest}
        />
      )}

      <div className="editor-content">
        <div className="editor-pane">
          <CodeMirrorEditor
            ref={editorRef}
            docId={docId}
            initialDoc={content}
            onChange={handleChange}
            livePreview={readOnly || viewMode === "live"}
            readOnly={readOnly}
            onAIRequest={aiEnabled && !readOnly ? handleAIRequest : null}
          />
        </div>
      </div>
      {!readOnly && aiEnabled && aiPanelExpanded && (
        <EditorAIPanel
          expanded={aiPanelExpanded}
          onToggle={() => setAiPanelExpanded((v) => !v)}
          content={content}
          onReplaceAll={(text) => {
            editorRef.current?.replaceAll(text);
          }}
          onReplaceRange={(from, to, text) => {
            editorRef.current?.replaceRange(from, to, text);
          }}
          pendingRequest={aiPendingRequest}
          onRequestHandled={() => setAiPendingRequest(null)}
        />
      )}
      {!readOnly && (
        <ShortcutFooter
          aiEnabled={aiEnabled}
          aiPanelExpanded={aiPanelExpanded}
          onAIToggle={() => setAiPanelExpanded((v) => !v)}
        />
      )}

      {!readOnly && (
        <div className="absolute bottom-7 right-3 text-[10px] text-muted-foreground">
          {saving ? "保存中..." : ""}
        </div>
      )}
    </div>
  );
}
