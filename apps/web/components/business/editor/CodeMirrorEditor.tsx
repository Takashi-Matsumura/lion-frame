"use client";

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { EditorView } from "@codemirror/view";
import { createEditorState, livePreviewCompartment, tablePreviewCompartment, selectionTooltipCompartment, inlineSuggestionCompartment } from "@/components/business/editor/codemirror/setup";
import { livePreviewPlugin, tableDecorationField } from "@/components/business/editor/codemirror/live-preview";
import { selectionTooltipField, aiRequestCallbackFacet } from "@/components/business/editor/codemirror/selection-tooltip";
import { addSuggestionEffect, clearSuggestionEffect, suggestionCallbackFacet, type InlineSuggestion } from "@/components/business/editor/codemirror/inline-suggestion";

export interface CodeMirrorEditorHandle {
  clearFocus: () => void;
  replaceRange: (from: number, to: number, text: string) => void;
  replaceAll: (text: string) => void;
  getSelection: () => { from: number; to: number; text: string } | null;
  /** エディタ内にインラインサジェスションを表示する */
  showSuggestion: (suggestion: InlineSuggestion) => void;
  /** インラインサジェスションをクリアする */
  clearSuggestion: () => void;
}

interface CodeMirrorEditorProps {
  docId: string;
  initialDoc: string;
  onChange: (doc: string) => void;
  livePreview: boolean;
  readOnly?: boolean;
  onAIRequest?: ((req: { action: string; selectedText: string; selectionRange: { from: number; to: number } }) => void) | null;
  onSuggestionAction?: ((action: "accept" | "reject", suggestion: InlineSuggestion) => void) | null;
}

const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, CodeMirrorEditorProps>(function CodeMirrorEditor({
  docId,
  initialDoc,
  onChange,
  livePreview,
  readOnly = false,
  onAIRequest,
  onSuggestionAction,
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

    const state = createEditorState(initialDoc, guardedOnChange, livePreview, readOnly, onAIRequest, onSuggestionAction);
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

  // インラインサジェスションコールバックの動的切り替え
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    try {
      view.dispatch({
        effects: inlineSuggestionCompartment.reconfigure(
          onSuggestionAction
            ? suggestionCallbackFacet.of(onSuggestionAction)
            : [],
        ),
      });
    } catch {
      // View may be in transition
    }
  }, [onSuggestionAction]);

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
    showSuggestion: (suggestion: InlineSuggestion) => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: addSuggestionEffect.of(suggestion),
      });
      // サジェスション位置にスクロール
      view.dispatch({
        selection: { anchor: suggestion.from },
        scrollIntoView: true,
      });
    },
    clearSuggestion: () => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: clearSuggestionEffect.of(undefined),
      });
    },
  }), []);

  return <div ref={containerRef} className="cm-container" />;
});

export default CodeMirrorEditor;
