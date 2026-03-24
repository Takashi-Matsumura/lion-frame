"use client";

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { EditorView } from "@codemirror/view";
import { createEditorState, livePreviewCompartment, tablePreviewCompartment } from "@/components/business/editor/codemirror/setup";
import { livePreviewPlugin, tableDecorationField } from "@/components/business/editor/codemirror/live-preview";

export interface CodeMirrorEditorHandle {
  /** カーソル選択をクリアしてプレビュー表示に戻す */
  clearFocus: () => void;
}

interface CodeMirrorEditorProps {
  docId: string;
  initialDoc: string;
  onChange: (doc: string) => void;
  livePreview: boolean;
  readOnly?: boolean;
}

const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, CodeMirrorEditorProps>(function CodeMirrorEditor({
  docId,
  initialDoc,
  onChange,
  livePreview,
  readOnly = false,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const docIdRef = useRef(docId);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const stableOnChange = useCallback((doc: string) => {
    onChangeRef.current(doc);
  }, []);

  docIdRef.current = docId;

  useEffect(() => {
    if (!containerRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const currentDocId = docId;
    const guardedOnChange = (doc: string) => {
      if (docIdRef.current === currentDocId) {
        stableOnChange(doc);
      }
    };

    const state = createEditorState(initialDoc, guardedOnChange, livePreview, readOnly);
    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    try {
      view.dispatch({
        effects: [
          livePreviewCompartment.reconfigure(
            livePreview ? livePreviewPlugin : []
          ),
          tablePreviewCompartment.reconfigure(
            livePreview ? tableDecorationField : []
          ),
        ],
      });
    } catch {
      // View may be in transition during document switch
    }
  }, [livePreview]);

  // 外部からカーソルをクリアしてプレビュー表示に戻すためのハンドル
  useImperativeHandle(ref, () => ({
    clearFocus: () => {
      const view = viewRef.current;
      if (!view) return;
      // フォーカスを外す → focusChanged がトリガーされ、
      // getCursorLines が空Setを返し、全行プレビュー表示になる
      view.contentDOM.blur();
    },
  }), []);

  return <div ref={containerRef} className="cm-container" />;
});

export default CodeMirrorEditor;
