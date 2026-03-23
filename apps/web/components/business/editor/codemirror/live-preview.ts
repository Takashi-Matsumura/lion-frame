import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { EditorState, Range } from "@codemirror/state";
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

// ── Helpers ──

function getCursorLines(state: EditorState): Set<number> {
  const lines = new Set<number>();
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
      if (type === "FencedCode") {
        handleFencedCode(state, node as unknown as { from: number; to: number; node: TreeNode }, cursorLines, decos);
        return false;
      }
      if (type === "Blockquote") {
        handleBlockquote(state, node as unknown as { from: number; to: number; node: TreeNode }, cursorLines, decos);
        return false;
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
      if (type === "Strikethrough") {
        hideMarkers(decos, from, to, 2, "cm-rendered-strikethrough");
        return false;
      }
    },
  });

  return Decoration.set(decos, true);
}

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
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
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
