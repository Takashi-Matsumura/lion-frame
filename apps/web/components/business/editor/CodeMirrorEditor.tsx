"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { createEditorState, livePreviewCompartment } from "@/components/business/editor/codemirror/setup";
import { livePreviewPlugin } from "@/components/business/editor/codemirror/live-preview";

interface CodeMirrorEditorProps {
  docId: string;
  initialDoc: string;
  onChange: (doc: string) => void;
  livePreview: boolean;
  readOnly?: boolean;
}

export default function CodeMirrorEditor({
  docId,
  initialDoc,
  onChange,
  livePreview,
  readOnly = false,
}: CodeMirrorEditorProps) {
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
        effects: livePreviewCompartment.reconfigure(
          livePreview ? livePreviewPlugin : []
        ),
      });
    } catch {
      // View may be in transition during document switch
    }
  }, [livePreview]);

  return <div ref={containerRef} className="cm-container" />;
}
