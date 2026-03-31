"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { ViewMode } from "@/components/business/editor/types";

interface AIRequest {
  action: string;
  selectedText?: string;
  selectionRange?: { from: number; to: number };
}

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  content: string;
  onMediaInsert?: (markdown: string) => void;
  aiEnabled?: boolean;
  onAIRequest?: (req: AIRequest) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function Toolbar({
  viewMode,
  onViewModeChange,
  content,
  onMediaInsert,
  aiEnabled = false,
  onAIRequest,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!aiMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setAiMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [aiMenuOpen]);

  const handleAIAction = useCallback(
    (action: string) => {
      setAiMenuOpen(false);
      onAIRequest?.({ action });
    },
    [onAIRequest],
  );

  const stats = useMemo(() => {
    const chars = content.length;
    const lines = content ? content.split("\n").length : 0;
    const size = new TextEncoder().encode(content).byteLength;
    return { chars, lines, size };
  }, [content]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onMediaInsert) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/editor/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Upload failed");
        return;
      }

      const data = await res.json();

      if (data.mediaType === "video") {
        onMediaInsert(`\n<video src="${data.url}" controls width="100%"></video>\n`);
      } else {
        onMediaInsert(`\n![](${data.url})\n`);
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-stats">
          {stats.chars}文字 · {stats.lines}行 · {formatBytes(stats.size)}
        </span>
      </div>
      <div className="toolbar-group">
        {/* AI メニュー */}
        {aiEnabled && onAIRequest && (
          <div className="toolbar-ai-menu-wrapper" ref={aiMenuRef}>
            <button
              className={`toolbar-btn ${aiMenuOpen ? "active" : ""}`}
              onClick={() => setAiMenuOpen((v) => !v)}
              title="AIアシスト"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span className="toolbar-btn-label">AI</span>
            </button>
            {aiMenuOpen && (
              <div className="toolbar-ai-dropdown">
                <button
                  className="toolbar-ai-dropdown-item"
                  onClick={() => handleAIAction("proofread-all")}
                >
                  文書全体を校正
                </button>
                <button
                  className="toolbar-ai-dropdown-item"
                  onClick={() => handleAIAction("summarize-all")}
                >
                  要約を生成
                </button>
                <button
                  className="toolbar-ai-dropdown-item"
                  onClick={() => handleAIAction("suggest-structure")}
                >
                  構成を提案
                </button>
              </div>
            )}
          </div>
        )}
        {/* メディアアップロード */}
        {onMediaInsert && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              className="toolbar-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="画像・動画を挿入"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="toolbar-btn-label">{uploading ? "..." : "メディア"}</span>
            </button>
          </>
        )}
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
