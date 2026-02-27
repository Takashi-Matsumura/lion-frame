import type { ReactNode } from "react";
import { create } from "zustand";

// 定数
const DEFAULT_POSITION = { x: 100, y: 100 };
const DEFAULT_SIZE = { width: 400, height: 300 };
const MIN_SIZE = { width: 200, height: 150 };

interface FloatingWindowPosition {
  x: number;
  y: number;
}

interface FloatingWindowSize {
  width: number;
  height: number;
}

interface OpenOptions {
  title?: string;
  titleJa?: string;
  content?: ReactNode;
  initialPosition?: FloatingWindowPosition;
  initialSize?: FloatingWindowSize;
}

// architecture-avoid-boolean-props: 3つのbooleanを単一のstatus型に統合
type WindowStatus = "closed" | "normal" | "minimized" | "maximized";

interface FloatingWindowStore {
  // 表示状態（単一のstatus型で無効な状態の組み合わせを排除）
  windowStatus: WindowStatus;

  // 位置とサイズ
  position: FloatingWindowPosition;
  size: FloatingWindowSize;

  // 最大化前の状態を保存
  prevPosition: FloatingWindowPosition | null;
  prevSize: FloatingWindowSize | null;

  // コンテンツ
  title: string;
  titleJa: string;
  content: ReactNode | null;

  // アクション
  open: (options?: OpenOptions) => void;
  close: () => void;
  minimize: () => void;
  maximize: () => void;
  restore: () => void;
  setPosition: (position: FloatingWindowPosition) => void;
  setSize: (size: FloatingWindowSize) => void;
  setContent: (content: ReactNode) => void;
}

export const useFloatingWindowStore = create<FloatingWindowStore>(
  (set, get) => ({
    // 初期状態
    windowStatus: "closed",
    position: DEFAULT_POSITION,
    size: DEFAULT_SIZE,
    prevPosition: null,
    prevSize: null,
    title: "Sub Window",
    titleJa: "サブウィンドウ",
    content: null,

    open: (options) => {
      set({
        windowStatus: "normal",
        title: options?.title ?? "Sub Window",
        titleJa: options?.titleJa ?? "サブウィンドウ",
        content: options?.content ?? null,
        position: options?.initialPosition ?? DEFAULT_POSITION,
        size: options?.initialSize ?? DEFAULT_SIZE,
      });
    },

    close: () => {
      set({
        windowStatus: "closed",
        content: null,
        prevPosition: null,
        prevSize: null,
      });
    },

    minimize: () => {
      set({ windowStatus: "minimized" });
    },

    maximize: () => {
      const { position, size, windowStatus } = get();
      if (windowStatus !== "maximized") {
        set({
          prevPosition: position,
          prevSize: size,
          position: { x: 0, y: 0 },
          size: {
            width: typeof window !== "undefined" ? window.innerWidth : 1200,
            height: typeof window !== "undefined" ? window.innerHeight : 800,
          },
          windowStatus: "maximized",
        });
      }
    },

    restore: () => {
      const { prevPosition, prevSize, windowStatus } = get();
      if (windowStatus === "maximized" && prevPosition && prevSize) {
        set({
          position: prevPosition,
          size: prevSize,
          windowStatus: "normal",
          prevPosition: null,
          prevSize: null,
        });
      } else if (windowStatus === "minimized") {
        set({ windowStatus: "normal" });
      }
    },

    setPosition: (position) => {
      set({ position });
    },

    setSize: (size) => {
      set({
        size: {
          width: Math.max(size.width, MIN_SIZE.width),
          height: Math.max(size.height, MIN_SIZE.height),
        },
      });
    },

    setContent: (content) => {
      set({ content });
    },
  }),
);

export { DEFAULT_POSITION, DEFAULT_SIZE, MIN_SIZE };
export type { WindowStatus };
