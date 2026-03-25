import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { EditorState, Range, StateField, StateEffect } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

// Structural type for syntax tree nodes (avoids @lezer/common dependency)
interface TreeNode {
  from: number;
  to: number;
  type: { name: string };
  getChild(name: string): TreeNode | null;
  getChildren(name: string): TreeNode[];
  parent?: TreeNode | null;
}

// ── Widget singletons ──

const bulletWidget = new (class extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-list-bullet-widget";
    span.textContent = "\u2022";
    return span;
  }
  eq() {
    return true;
  }
})();

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = `cm-checkbox-widget ${this.checked ? "checked" : ""}`;
    span.textContent = this.checked ? "\u2611" : "\u2610";
    return span;
  }
  eq(other: CheckboxWidget) {
    return this.checked === other.checked;
  }
}

const checkboxUnchecked = new CheckboxWidget(false);
const checkboxChecked = new CheckboxWidget(true);

// ── Emoji ──

const EMOJI_MAP: Record<string, string> = {
  warning: "⚠️",
  info: "ℹ️",
  note: "📝",
  tip: "💡",
  important: "❗",
  caution: "⚠️",
  check: "✅",
  x: "❌",
  star: "⭐",
  fire: "🔥",
  rocket: "🚀",
  bulb: "💡",
  memo: "📝",
  book: "📖",
  link: "🔗",
  question: "❓",
  exclamation: "❗",
  thumbsup: "👍",
  thumbsdown: "👎",
  heart: "❤️",
  smile: "😊",
  thinking: "🤔",
  tada: "🎉",
  construction: "🚧",
  lock: "🔒",
  key: "🔑",
  chart: "📊",
  calendar: "📅",
  email: "📧",
  phone: "📞",
  pin: "📌",
  clip: "📎",
  folder: "📁",
  file: "📄",
  gear: "⚙️",
  wrench: "🔧",
  hammer: "🔨",
  shield: "🛡️",
  trophy: "🏆",
  flag: "🚩",
  bell: "🔔",
  clock: "🕐",
  hourglass: "⏳",
  mag: "🔍",
  sparkles: "✨",
  zap: "⚡",
  package: "📦",
  truck: "🚚",
  money: "💰",
  yen: "💴",
  dollar: "💵",
  handshake: "🤝",
  muscle: "💪",
  eyes: "👀",
  point_right: "👉",
  point_left: "👈",
  point_up: "👆",
  point_down: "👇",
  white_check_mark: "✅",
  heavy_check_mark: "✔️",
  arrow_right: "➡️",
  arrow_left: "⬅️",
  arrow_up: "⬆️",
  arrow_down: "⬇️",
};

class EmojiWidget extends WidgetType {
  constructor(readonly emoji: string) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-emoji-widget";
    span.textContent = this.emoji;
    return span;
  }
  eq(other: EmojiWidget) {
    return this.emoji === other.emoji;
  }
}

// ── フォーカス状態の追跡 ──
// StateField でフォーカス状態を管理し、StateField/ViewPlugin 両方からアクセス可能にする

const setFocused = StateEffect.define<boolean>();

export const editorFocusField = StateField.define<boolean>({
  create: () => false,
  update(focused, tr) {
    for (const e of tr.effects) {
      if (e.is(setFocused)) return e.value;
    }
    return focused;
  },
});

/** フォーカス変更を検出して editorFocusField を更新する ViewPlugin */
export const focusTracker = ViewPlugin.fromClass(
  class {
    constructor(private view: EditorView) {
      // 初期状態を同期
      Promise.resolve().then(() => {
        this.view.dispatch({ effects: setFocused.of(this.view.hasFocus) });
      });
    }
    update(update: ViewUpdate) {
      if (update.focusChanged) {
        // update中にdispatchするとエラーになるため、次フレームに遅延
        requestAnimationFrame(() => {
          this.view.dispatch({ effects: setFocused.of(this.view.hasFocus) });
        });
      }
    }
  },
);

// ── Helpers ──

function getCursorLines(state: EditorState): Set<number> {
  const lines = new Set<number>();
  // エディタにフォーカスがない場合はカーソル行なし → 全行プレビュー表示
  const focused = state.field(editorFocusField, false);
  if (focused === false) return lines;
  for (const range of state.selection.ranges) {
    if (range.from > state.doc.length || range.to > state.doc.length) continue;
    const lineFrom = state.doc.lineAt(range.from).number;
    const lineTo = state.doc.lineAt(range.to).number;
    for (let l = lineFrom; l <= lineTo; l++) {
      lines.add(l);
    }
  }
  return lines;
}

function nodeHasCursor(
  state: EditorState,
  from: number,
  to: number,
  cursorLines: Set<number>
): boolean {
  const lineStart = state.doc.lineAt(from).number;
  const lineEnd = state.doc.lineAt(to).number;
  for (let l = lineStart; l <= lineEnd; l++) {
    if (cursorLines.has(l)) return true;
  }
  return false;
}

/** Shared pattern: hide symmetric markers, style content between them */
function hideMarkers(
  decos: Range<Decoration>[],
  from: number,
  to: number,
  markerLen: number,
  contentClass: string
) {
  if (to - from <= markerLen * 2) return;
  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(from, from + markerLen)
  );
  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(to - markerLen, to)
  );
  decos.push(
    Decoration.mark({ class: contentClass }).range(
      from + markerLen,
      to - markerLen
    )
  );
}

// ── Inline element handlers ──

function handleHeading(
  state: EditorState,
  node: { from: number; to: number; type: { name: string }; node: TreeNode },
  decos: Range<Decoration>[]
) {
  const level = node.type.name.charCodeAt(10) - 48; // "ATXHeading1"[10] = '1'
  const headerMark = node.node.getChild("HeaderMark");
  if (!headerMark) return;

  const lineObj = state.doc.lineAt(node.from);
  const afterMark = Math.min(headerMark.to + 1, lineObj.to);

  if (afterMark > node.from) {
    decos.push(
      Decoration.mark({ class: "cm-hide-syntax" }).range(node.from, afterMark)
    );
  }
  if (afterMark < node.to) {
    decos.push(
      Decoration.mark({ class: `cm-heading-${level}` }).range(afterMark, node.to)
    );
  }
}

function handleLink(
  node: { from: number; to: number; node: TreeNode },
  decos: Range<Decoration>[]
) {
  const linkMarks = node.node.getChildren("LinkMark");
  const urlNode = node.node.getChild("URL");
  if (linkMarks.length < 2 || !urlNode) return;

  const textStart = linkMarks[0].to;
  const textEnd = linkMarks[1].from;

  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(node.from, textStart)
  );
  decos.push(
    Decoration.mark({ class: "cm-rendered-link" }).range(textStart, textEnd)
  );
  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(textEnd, node.to)
  );
}

// ── Block element handlers ──

function handleBlockquote(
  state: EditorState,
  node: { from: number; to: number; node: TreeNode },
  cursorLines: Set<number>,
  decos: Range<Decoration>[]
) {
  const firstLine = state.doc.lineAt(node.from).number;
  const lastLine = state.doc.lineAt(node.to).number;

  for (let lineNum = firstLine; lineNum <= lastLine; lineNum++) {
    const line = state.doc.line(lineNum);
    decos.push(
      Decoration.line({ class: "cm-blockquote-line" }).range(line.from)
    );
  }

  // Find all QuoteMark descendants (including nested blockquotes)
  syntaxTree(state).iterate({
    from: node.from,
    to: node.to,
    enter(child) {
      if (child.type.name !== "QuoteMark") return;
      const qmLine = state.doc.lineAt(child.from).number;
      if (cursorLines.has(qmLine)) return;

      const lineObj = state.doc.line(qmLine);
      const afterMark = Math.min(child.to + 1, lineObj.to);
      if (afterMark > child.from) {
        decos.push(
          Decoration.mark({ class: "cm-hide-syntax" }).range(child.from, afterMark)
        );
      }
    },
  });
}

function handleFencedCode(
  state: EditorState,
  node: { from: number; to: number; node: TreeNode },
  cursorLines: Set<number>,
  decos: Range<Decoration>[]
) {
  const firstLine = state.doc.lineAt(node.from).number;
  const lastLine = state.doc.lineAt(node.to).number;
  const cursorInBlock = nodeHasCursor(state, node.from, node.to, cursorLines);

  const codeMarks = node.node.getChildren("CodeMark");
  const fenceLines = new Set<number>();
  for (const cm of codeMarks) {
    fenceLines.add(state.doc.lineAt(cm.from).number);
  }

  const codeInfo = node.node.getChild("CodeInfo");
  if (codeInfo) {
    fenceLines.add(state.doc.lineAt(codeInfo.from).number);
  }

  for (let lineNum = firstLine; lineNum <= lastLine; lineNum++) {
    const line = state.doc.line(lineNum);

    if (fenceLines.has(lineNum)) {
      if (!cursorInBlock) {
        decos.push(
          Decoration.line({ class: "cm-code-fence-hidden" }).range(line.from)
        );
        if (line.to > line.from) {
          decos.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(line.from, line.to)
          );
        }
      } else {
        decos.push(
          Decoration.line({ class: "cm-code-fence-visible" }).range(line.from)
        );
      }
    } else {
      decos.push(
        Decoration.line({ class: "cm-code-block-line" }).range(line.from)
      );
    }
  }
}

function handleListItem(
  state: EditorState,
  node: { from: number; to: number; node: TreeNode },
  cursorLines: Set<number>,
  isOrdered: boolean,
  decos: Range<Decoration>[]
) {
  const listMark = node.node.getChild("ListMark");
  if (!listMark) return;

  const markLine = state.doc.lineAt(listMark.from).number;
  if (cursorLines.has(markLine)) return;

  const lineObj = state.doc.line(markLine);
  const afterMark = listMark.to;
  const restOfLine = state.sliceDoc(afterMark, Math.min(afterMark + 4, lineObj.to));
  const taskMatch = restOfLine.match(/^\s?\[([ xX])\]/);

  if (taskMatch) {
    const checked = taskMatch[1] !== " ";
    const taskEnd = afterMark + taskMatch[0].length;
    const hideEnd = Math.min(taskEnd + 1, lineObj.to);
    decos.push(
      Decoration.replace({
        widget: checked ? checkboxChecked : checkboxUnchecked,
      }).range(listMark.from, hideEnd)
    );
  } else if (!isOrdered) {
    const hideEnd = Math.min(afterMark + 1, lineObj.to);
    decos.push(
      Decoration.replace({ widget: bulletWidget }).range(listMark.from, hideEnd)
    );
  }
}

// ── Table handler ──

class TableWidget extends WidgetType {
  constructor(
    readonly tableHtml: string,
    readonly sourceFrom: number,
  ) {
    super();
  }
  toDOM(view: EditorView) {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-table-widget";
    wrapper.style.cursor = "text";
    wrapper.innerHTML = this.tableHtml;
    wrapper.addEventListener("click", (e) => {
      e.preventDefault();
      // Move cursor into the table source to trigger source view
      view.dispatch({
        selection: { anchor: this.sourceFrom },
        scrollIntoView: true,
      });
      view.focus();
    });
    return wrapper;
  }
  eq(other: TableWidget) {
    return this.tableHtml === other.tableHtml && this.sourceFrom === other.sourceFrom;
  }
}

function handleTable(
  state: EditorState,
  node: { from: number; to: number; node: TreeNode },
  cursorLines: Set<number>,
  decos: Range<Decoration>[]
): boolean {
  const cursorInTable = nodeHasCursor(state, node.from, node.to, cursorLines);
  if (cursorInTable) return false;

  const text = state.sliceDoc(node.from, node.to);
  const lines = text.split("\n");
  if (lines.length < 2) return false;

  // Parse table — split by | and remove leading/trailing empty segments
  const parseRow = (line: string) => {
    const cells = line.split("|").map((c) => c.trim());
    // Remove first empty (before leading |) and last empty (after trailing |)
    if (cells.length > 0 && cells[0] === "") cells.shift();
    if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
    return cells;
  };

  const headerCells = parseRow(lines[0]);
  const bodyRows = lines.slice(2).filter((l) => l.trim()).map(parseRow);

  // Detect alignment from delimiter row
  const alignments: string[] = [];
  if (lines[1]) {
    const delims = parseRow(lines[1]);
    for (const d of delims) {
      if (d.startsWith(":") && d.endsWith(":")) alignments.push("center");
      else if (d.endsWith(":")) alignments.push("right");
      else alignments.push("left");
    }
  }

  let html = '<table class="cm-rendered-table"><thead><tr>';
  for (let i = 0; i < headerCells.length; i++) {
    const align = alignments[i] ? ` style="text-align:${alignments[i]}"` : "";
    html += `<th${align}>${escapeHtml(headerCells[i])}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (const row of bodyRows) {
    html += "<tr>";
    for (let i = 0; i < headerCells.length; i++) {
      const align = alignments[i] ? ` style="text-align:${alignments[i]}"` : "";
      html += `<td${align}>${escapeHtml(row[i] ?? "")}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";

  // Insert rendered table as block widget before first line
  const firstLine = state.doc.lineAt(node.from);
  decos.push(
    Decoration.widget({ widget: new TableWidget(html, node.from), block: true, side: -1 }).range(firstLine.from)
  );

  // Hide all source lines via line class
  const startLine = firstLine.number;
  const endPos = Math.max(node.from, node.to - 1);
  const endLine = state.doc.lineAt(endPos).number;
  for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
    const line = state.doc.line(lineNum);
    decos.push(
      Decoration.line({ class: "cm-table-source-hidden" }).range(line.from)
    );
  }
  return true;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

// ── Main build function ──

const ATX_HEADING_PREFIX = "ATXHeading";

function buildDecorations(state: EditorState): DecorationSet {
  if (state.doc.length === 0) return Decoration.none;

  const decos: Range<Decoration>[] = [];
  const cursorLines = getCursorLines(state);

  syntaxTree(state).iterate({
    enter(node) {
      const { from, to } = node;
      if (from > state.doc.length || to > state.doc.length) return;
      if (from === to) return;

      const type = node.type.name;

      // Block elements (per-line cursor handling)
      // Table is handled by a separate StateField (block widgets not allowed in plugins)
      if (type === "Table") return false;
      if (type === "FencedCode") {
        handleFencedCode(state, node as unknown as { from: number; to: number; node: TreeNode }, cursorLines, decos);
        return false;
      }
      if (type === "Blockquote") {
        handleBlockquote(state, node as unknown as { from: number; to: number; node: TreeNode }, cursorLines, decos);
        // Don't return false — allow traversal into children for inline formatting (bold, italic, etc.)
      }
      if (type === "ListItem") {
        const parent = (node as unknown as { node: TreeNode }).node?.parent;
        const isOrdered = parent?.type.name === "OrderedList";
        handleListItem(state, node as unknown as { from: number; to: number; node: TreeNode }, cursorLines, isOrdered, decos);
      }

      // Inline elements (skip if on cursor line)
      if (nodeHasCursor(state, from, to, cursorLines)) return;

      if (type.startsWith(ATX_HEADING_PREFIX) && type.length === 11) {
        handleHeading(state, node as unknown as { from: number; to: number; type: { name: string }; node: TreeNode }, decos);
        return false;
      }
      if (type === "HorizontalRule") {
        decos.push(Decoration.mark({ class: "cm-rendered-hr-line" }).range(from, to));
        return false;
      }
      if (type === "StrongEmphasis") {
        const text = state.sliceDoc(from, to);
        hideMarkers(decos, from, to, text.startsWith("__") ? 2 : 2, "cm-rendered-bold");
        return false;
      }
      if (type === "Emphasis") {
        hideMarkers(decos, from, to, 1, "cm-rendered-italic");
        return false;
      }
      if (type === "InlineCode") {
        hideMarkers(decos, from, to, 1, "cm-rendered-code");
        return false;
      }
      if (type === "Link") {
        handleLink(node as unknown as { from: number; to: number; node: TreeNode }, decos);
        return false;
      }
      if (type === "Emoji") {
        const emojiText = state.sliceDoc(from, to); // e.g. ":warning:"
        const name = emojiText.slice(1, -1); // remove colons
        const emoji = EMOJI_MAP[name];
        if (emoji) {
          decos.push(
            Decoration.replace({ widget: new EmojiWidget(emoji) }).range(from, to)
          );
        }
        return false;
      }
      if (type === "Strikethrough") {
        hideMarkers(decos, from, to, 2, "cm-rendered-strikethrough");
        return false;
      }
    },
  });

  return Decoration.set(decos, true);
}

// ── Table StateField (block decorations require StateField, not ViewPlugin) ──

function buildTableDecorations(state: EditorState): DecorationSet {
  if (state.doc.length === 0) return Decoration.none;

  const decos: Range<Decoration>[] = [];
  const cursorLines = getCursorLines(state);

  syntaxTree(state).iterate({
    enter(node) {
      if (node.type.name === "Table") {
        handleTable(
          state,
          node as unknown as { from: number; to: number; node: TreeNode },
          cursorLines,
          decos,
        );
        return false;
      }
    },
  });

  return Decoration.set(decos, true);
}

export const tableDecorationField = StateField.define<DecorationSet>({
  create(state) {
    try {
      return buildTableDecorations(state);
    } catch {
      return Decoration.none;
    }
  },
  update(decos, tr) {
    if (tr.docChanged || tr.selection || tr.effects.some((e) => e.is(setFocused))) {
      try {
        return buildTableDecorations(tr.state);
      } catch {
        return Decoration.none;
      }
    }
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Inline/block plugin (everything except Table) ──

export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      try {
        this.decorations = buildDecorations(view.state);
      } catch {
        this.decorations = Decoration.none;
      }
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged || update.transactions.some((tr) => tr.effects.some((e) => e.is(setFocused)))) {
        try {
          this.decorations = buildDecorations(update.state);
        } catch {
          this.decorations = Decoration.none;
        }
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
