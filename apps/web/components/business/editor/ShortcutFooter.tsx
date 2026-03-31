"use client";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const shortcuts = [
  { label: "Bold", keys: `${mod}+B` },
  { label: "Italic", keys: `${mod}+I` },
  { label: "Code", keys: `${mod}+E` },
  { label: "Code Block", keys: `${mod}+\u21E7+E` },
  { label: "Link", keys: `${mod}+K` },
];

interface ShortcutFooterProps {
  aiEnabled?: boolean;
  aiPanelExpanded?: boolean;
  onAIToggle?: () => void;
}

export default function ShortcutFooter({
  aiEnabled = false,
  aiPanelExpanded = false,
  onAIToggle,
}: ShortcutFooterProps) {
  return (
    <div className="shortcut-footer">
      {shortcuts.map((s) => (
        <span key={s.label} className="shortcut-item">
          <kbd className="shortcut-kbd">{s.keys}</kbd>
          <span className="shortcut-label">{s.label}</span>
        </span>
      ))}
      {aiEnabled && (
        <button
          type="button"
          className={`shortcut-ai-btn ${aiPanelExpanded ? "active" : ""}`}
          onClick={onAIToggle}
          title="AIアシスト"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="shortcut-label">AI</span>
        </button>
      )}
    </div>
  );
}
