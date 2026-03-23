"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import "@excalidraw/excalidraw/index.css";

// Volatile appState keys to strip before saving
const VOLATILE_KEYS = new Set([
  "collaborators",
  "selectedElementIds",
  "selectedGroupIds",
  "cursorButton",
  "editingElement",
  "resizingElement",
  "draggingElement",
  "editingGroupId",
  "openPopup",
  "lastPointerDownWith",
  "selectedLinearElement",
  "pasteDialog",
  "toast",
  "openSidebar",
  "openDialog",
  "activeEmbeddable",
  "snapLines",
  "userToFollow",
]);

interface ExcalidrawEditorProps {
  initialData: string;
  onChange: (content: string) => void;
  theme: "light" | "dark";
}

interface ExcalidrawScene {
  elements: readonly Record<string, unknown>[];
  appState: Record<string, unknown>;
}

function stripVolatileState(
  appState: Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(appState)) {
    if (!VOLATILE_KEYS.has(key)) {
      cleaned[key] = appState[key];
    }
  }
  return cleaned;
}

// Keys in appState controlled by the app, not saved data
const APP_CONTROLLED_KEYS = new Set(["theme", "viewBackgroundColor"]);

function parseInitialData(content: string): {
  elements: readonly Record<string, unknown>[];
  appState: Record<string, unknown>;
} {
  if (!content) return { elements: [], appState: {} };
  try {
    const data = JSON.parse(content);
    const appState = data.appState ?? {};
    // Remove app-controlled keys so they're always set from props
    const cleaned: Record<string, unknown> = {};
    for (const key of Object.keys(appState)) {
      if (!APP_CONTROLLED_KEYS.has(key)) {
        cleaned[key] = appState[key];
      }
    }
    return {
      elements: data.elements ?? [],
      appState: cleaned,
    };
  } catch {
    return { elements: [], appState: {} };
  }
}

export default function ExcalidrawEditor({
  initialData,
  onChange,
  theme,
}: ExcalidrawEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ExcalidrawComp, setExcalidrawComp] = useState<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialRef = useRef(parseInitialData(initialData));

  // Dynamic import (SSR-safe)
  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      setExcalidrawComp(() => mod.Excalidraw);
    });
  }, []);

  const handleChange = useCallback(
    (
      elements: readonly Record<string, unknown>[],
      appState: Record<string, unknown>
    ) => {
      const cleaned = stripVolatileState(appState);
      const json = JSON.stringify({ elements, appState: cleaned });
      onChangeRef.current(json);
    },
    []
  );

  if (!ExcalidrawComp) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ExcalidrawComp
        initialData={{
          elements: initialRef.current.elements,
          appState: {
            ...initialRef.current.appState,
            theme,
          },
        }}
        theme={theme}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
          },
        }}
      />
    </div>
  );
}
