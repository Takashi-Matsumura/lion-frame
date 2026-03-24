import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const obsidianTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--editor-bg-primary)",
      color: "var(--editor-text-normal)",
      height: "100%",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-content": {
      fontFamily: "var(--editor-font)",
      fontSize: "16px",
      lineHeight: "1.6",
      padding: "20px 0",
      caretColor: "var(--editor-accent)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--editor-accent)",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground": {
      backgroundColor: "var(--editor-selection-bg) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--editor-selection-bg-focus) !important",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--editor-active-line-bg)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--editor-bg-primary)",
      color: "var(--editor-text-faint)",
      border: "none",
      paddingRight: "8px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--editor-active-line-bg)",
      color: "var(--editor-text-muted)",
    },
    ".cm-line": {
      padding: "0 16px",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    // Live Preview: hide syntax markers
    ".cm-hide-syntax": {
      fontSize: "0",
      display: "inline",
      width: "0",
      overflow: "hidden",
    },
    // Live Preview: table source lines hidden
    ".cm-line.cm-table-source-hidden": {
      fontSize: "0 !important",
      height: "0 !important",
      lineHeight: "0 !important",
      overflow: "hidden !important",
      padding: "0 !important",
      margin: "0 !important",
      minHeight: "0 !important",
      border: "none !important",
      display: "block !important",
      maxHeight: "0 !important",
    },
    ".cm-table-widget": {
      margin: "4px 0 0 0",
      overflowX: "auto",
    },
    ".cm-table-widget table": {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "0.9em",
      tableLayout: "auto",
    },
    ".cm-table-widget th, .cm-table-widget td": {
      border: "1px solid var(--editor-border-color)",
      padding: "6px 12px",
      wordBreak: "break-word",
    },
    ".cm-table-widget th": {
      backgroundColor: "var(--editor-bg-secondary)",
      fontWeight: "600",
    },
    ".cm-table-widget tr:nth-child(even) td": {
      backgroundColor: "var(--editor-bg-tertiary)",
    },
  },
  { dark: false }
);

const obsidianHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.8em", color: "var(--editor-h1-color)" },
  { tag: tags.heading2, fontWeight: "700", fontSize: "1.5em", color: "var(--editor-h2-color)" },
  { tag: tags.heading3, fontWeight: "600", fontSize: "1.3em", color: "var(--editor-h3-color)" },
  { tag: tags.heading4, fontWeight: "600", fontSize: "1.1em", color: "var(--editor-h4-color)" },
  { tag: tags.heading5, fontWeight: "600", fontSize: "1.05em", color: "var(--editor-h5-color)" },
  { tag: tags.heading6, fontWeight: "600", fontSize: "1em", color: "var(--editor-h6-color)" },
  { tag: tags.strong, fontWeight: "700", color: "var(--editor-text-bold)" },
  { tag: tags.emphasis, fontStyle: "italic", color: "var(--editor-text-italic)" },
  { tag: tags.link, color: "var(--editor-link-color)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--editor-link-color)" },
  { tag: tags.monospace, color: "var(--editor-code-color)", backgroundColor: "var(--editor-code-bg)", borderRadius: "3px", padding: "1px 4px" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--editor-text-faint)" },
  { tag: tags.quote, color: "var(--editor-text-muted)", fontStyle: "italic" },
  { tag: tags.list, color: "var(--editor-accent)" },
  { tag: tags.meta, color: "var(--editor-text-faint)" },
  { tag: tags.processingInstruction, color: "var(--editor-text-faint)" },
]);

export const obsidianHighlighting = syntaxHighlighting(obsidianHighlightStyle);
