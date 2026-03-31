"use client";

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { EditorView } from "@codemirror/view";
import { createEditorState, livePreviewCompartment, tablePreviewCompartment, selectionTooltipCompartment } from "@/components/business/editor/codemirror/setup";
import { livePreviewPlugin, tableDecorationField } from "@/components/business/editor/codemirror/live-preview";
import { selectionTooltipField, aiRequestCallbackFacet } from "@/components/business/editor/codemirror/selection-tooltip";

export interface CodeMirrorEditorHandle {
  /** カーソル選択をクリアしてプレビュー表示に戻す */
  clearFocus: () => void;
  /** 指定範囲のテキストを置換する */
  replaceRange: (from: number, to: number, text: string) => void;
  /** ドキュメント全体を置換する */
  replaceAll: (text: string) => void;
  /** 現在の選択範囲を取得する */
  getSelection: () => { from: number; to: number; text: string } | null;
}

interface CodeMirrorEditorProps {
  docId: string;
  initialDoc: string;
  onChange: (doc: string) => void;
  livePreview: boolean;
  readOnly?: boolean;
  onAIRequest?: ((req: { action: string; selectedText: string; selectionRange: { from: number; to: number } }) => void) | null;
}

const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, CodeMirrorEditorProps>(function CodeMirrorEditor({
  docId,
  initialDoc,
  onChange,
  livePreview,
  readOnly = false,
  onAIRequest,
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

    const state = createEditorState(initialDoc, guardedOnChange, livePreview, readOnly, onAIRequest);
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

  // AI選択ツールチップの動的切り替え
  const onAIRequestRef = useRef(onAIRequest);
  onAIRequestRef.current = onAIRequest;

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    try {
      view.dispatch({
        effects: selectionTooltipCompartment.reconfigure(
          onAIRequest
            ? [aiRequestCallbackFacet.of(onAIRequest), selectionTooltipField]
            : [],
        ),
      });
    } catch {
      // View may be in transition
    }
  }, [onAIRequest]);

  // 外部からカーソルをクリアしてプレビュー表示に戻すためのハンドル
  useImperativeHandle(ref, () => ({
    clearFocus: () => {
      const view = viewRef.current;
      if (!view) return;
      view.contentDOM.blur();
    },
    replaceRange: (from: number, to: number, text: string) => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
    },
    replaceAll: (text: string) => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: { anchor: 0 },
      });
    },
    getSelection: () => {
      const view = viewRef.current;
      if (!view) return null;
      const { from, to } = view.state.selection.main;
      if (from === to) return null;
      return { from, to, text: view.state.sliceDoc(from, to) };
    },
  }), []);

  return <div ref={containerRef} className="cm-container" />;
});

export default CodeMirrorEditor;
