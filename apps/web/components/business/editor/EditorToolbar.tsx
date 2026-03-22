"use client";

type ViewMode = "live" | "source" | "split";
type Theme = "dark" | "light";

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  title: string;
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
}

export default function Toolbar({
  viewMode,
  onViewModeChange,
  theme,
  onThemeChange,
  title,
  onSidebarToggle,
  sidebarOpen,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${sidebarOpen ? "active" : ""}`}
          onClick={onSidebarToggle}
          title="サイドバー"
          style={{ marginRight: 4 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="toolbar-doc-title" title={title}>{title}</span>
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
        <button
          className={`toolbar-btn ${viewMode === "split" ? "active" : ""}`}
          onClick={() => onViewModeChange("split")}
          title="分割表示"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          <span className="toolbar-btn-label">分割</span>
        </button>
        <div className="toolbar-divider" />
        <button
          className="toolbar-btn"
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"}
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          <span className="toolbar-btn-label">{theme === "dark" ? "ライト" : "ダーク"}</span>
        </button>
      </div>
    </div>
  );
}
