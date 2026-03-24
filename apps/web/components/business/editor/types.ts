export type ViewMode = "live" | "source";
export type DocType = "markdown" | "excalidraw";

export const SAVE_DEBOUNCE: Record<DocType, number> = {
  markdown: 500,
  excalidraw: 1000,
};

export const DEFAULT_WINDOW_SIZE: Record<DocType, { width: number; height: number }> = {
  markdown: { width: 900, height: 600 },
  excalidraw: { width: 1100, height: 700 },
};
