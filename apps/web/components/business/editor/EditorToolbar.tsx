"use client";

import { useMemo } from "react";
import type { ViewMode } from "@/components/business/editor/types";

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  content: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function Toolbar({
  viewMode,
  onViewModeChange,
  content,
}: ToolbarProps) {
  const stats = useMemo(() => {
    const chars = content.length;
    const lines = content ? content.split("\n").length : 0;
    const size = new TextEncoder().encode(content).byteLength;
    return { chars, lines, size };
  }, [content]);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-stats">
          {stats.chars}文字 · {stats.lines}行 · {formatBytes(stats.size)}
        </span>
      </div>
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${viewMode === "live" ? "active" : ""}`}
          onClick={() => onViewModeChange("live")}
          title="ライブプレビュー"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="toolbar-btn-label">ライブ</span>
        </button>
        <button
          className={`toolbar-btn ${viewMode === "source" ? "active" : ""}`}
          onClick={() => onViewModeChange("source")}
          title="ソースモード"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="toolbar-btn-label">ソース</span>
        </button>
      </div>
    </div>
  );
}
