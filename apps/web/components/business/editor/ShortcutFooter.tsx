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

export default function ShortcutFooter() {
  return (
    <div className="shortcut-footer">
      {shortcuts.map((s) => (
        <span key={s.label} className="shortcut-item">
          <kbd className="shortcut-kbd">{s.keys}</kbd>
          <span className="shortcut-label">{s.label}</span>
        </span>
      ))}
    </div>
  );
}
