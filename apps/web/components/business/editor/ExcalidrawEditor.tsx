"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import "@excalidraw/excalidraw/index.css";

// appStateからセーブ時に除外するキー（揮発的 + アプリ制御）
const EXCLUDED_SAVE_KEYS = new Set([
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

// appStateからロード時に除外するキー（アプリが常にpropから設定する）
const APP_CONTROLLED_KEYS = new Set(["theme", "viewBackgroundColor"]);

function filterKeys(
  obj: Record<string, unknown>,
  excludeKeys: Set<string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (!excludeKeys.has(key)) result[key] = obj[key];
  }
  return result;
}

interface ExcalidrawEditorProps {
  initialData: string;
  onChange: (content: string) => void;
  theme: "light" | "dark";
}

function parseInitialData(content: string): {
  elements: readonly Record<string, unknown>[];
  appState: Record<string, unknown>;
} {
  if (!content) return { elements: [], appState: {} };
  try {
    const data = JSON.parse(content);
    return {
      elements: data.elements ?? [],
      appState: filterKeys(data.appState ?? {}, APP_CONTROLLED_KEYS),
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
      const cleaned = filterKeys(appState, EXCLUDED_SAVE_KEYS);
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
        langCode="ja-JP"
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
