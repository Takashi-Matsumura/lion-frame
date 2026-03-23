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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SyntaxNodeLike = any;

// ── Widget classes ──

class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-list-bullet-widget";
    span.textContent = "•";
    return span;
  }
  eq() {
    return true;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = `cm-checkbox-widget ${this.checked ? "checked" : ""}`;
    span.textContent = this.checked ? "☑" : "☐";
    return span;
  }
  eq(other: CheckboxWidget) {
    return this.checked === other.checked;
  }
}

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

// ── Inline element handlers ──

function handleHeading(
  state: EditorState,
  node: { from: number; to: number; type: { name: string }; node: SyntaxNodeLike },
  decos: Range<Decoration>[]
) {
  const level = parseInt(node.type.name.charAt(node.type.name.length - 1));
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
      Decoration.mark({ class: `cm-heading-${level}` }).range(
        afterMark,
        node.to
      )
    );
  }
}

function handleStrongEmphasis(
  state: EditorState,
  from: number,
  to: number,
  decos: Range<Decoration>[]
) {
  const text = state.sliceDoc(from, to);
  const marker = text.startsWith("__") ? "__" : "**";
  const mLen = marker.length;
  if (to - from <= mLen * 2) return;

  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(from, from + mLen)
  );
  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(to - mLen, to)
  );
  decos.push(
    Decoration.mark({ class: "cm-rendered-bold" }).range(
      from + mLen,
      to - mLen
    )
  );
}

function handleEmphasis(
  state: EditorState,
  from: number,
  to: number,
  decos: Range<Decoration>[]
) {
  const text = state.sliceDoc(from, to);
  const marker = text.startsWith("_") ? "_" : "*";
  const mLen = marker.length;
  if (to - from <= mLen * 2) return;

  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(from, from + mLen)
  );
  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(to - mLen, to)
  );
  decos.push(
    Decoration.mark({ class: "cm-rendered-italic" }).range(
      from + mLen,
      to - mLen
    )
  );
}

function handleInlineCode(from: number, to: number, decos: Range<Decoration>[]) {
  if (to - from <= 2) return;
  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(from, from + 1)
  );
  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(to - 1, to)
  );
  decos.push(
    Decoration.mark({ class: "cm-rendered-code" }).range(from + 1, to - 1)
  );
}

function handleLink(
  node: { from: number; to: number; node: SyntaxNodeLike },
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

function handleStrikethrough(from: number, to: number, decos: Range<Decoration>[]) {
  if (to - from <= 4) return;
  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(from, from + 2)
  );
  decos.push(
    Decoration.mark({ class: "cm-hide-syntax" }).range(to - 2, to)
  );
  decos.push(
    Decoration.mark({ class: "cm-rendered-strikethrough" }).range(
      from + 2,
      to - 2
    )
  );
}

function handleHorizontalRule(from: number, to: number, decos: Range<Decoration>[]) {
  decos.push(
    Decoration.mark({ class: "cm-rendered-hr-line" }).range(from, to)
  );
}

// ── Block element handlers ──

function handleBlockquote(
  state: EditorState,
  node: { from: number; to: number; node: SyntaxNodeLike },
  cursorLines: Set<number>,
  decos: Range<Decoration>[]
) {
  const firstLine = state.doc.lineAt(node.from).number;
  const lastLine = state.doc.lineAt(node.to).number;

  // Add border-left line decoration to all lines
  for (let lineNum = firstLine; lineNum <= lastLine; lineNum++) {
    const line = state.doc.line(lineNum);
    decos.push(
      Decoration.line({ class: "cm-blockquote-line" }).range(line.from)
    );
  }

  // Hide all QuoteMark (>) descendants on non-cursor lines
  // Use syntaxTree iterate to find all QuoteMarks including nested ones
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
          Decoration.mark({ class: "cm-hide-syntax" }).range(
            child.from,
            afterMark
          )
        );
      }
    },
  });
}

function handleFencedCode(
  state: EditorState,
  node: { from: number; to: number; node: SyntaxNodeLike },
  cursorLines: Set<number>,
  decos: Range<Decoration>[]
) {
  const firstLine = state.doc.lineAt(node.from).number;
  const lastLine = state.doc.lineAt(node.to).number;

  // Check if cursor is anywhere in the code block
  let cursorInBlock = false;
  for (let l = firstLine; l <= lastLine; l++) {
    if (cursorLines.has(l)) {
      cursorInBlock = true;
      break;
    }
  }

  // Get CodeMark positions (opening/closing ```)
  const codeMarks = node.node.getChildren("CodeMark");
  const fenceLines = new Set<number>();
  for (const cm of codeMarks) {
    fenceLines.add(state.doc.lineAt(cm.from).number);
  }

  // Also treat the CodeInfo line (language tag) as part of fence
  const codeInfo = node.node.getChild("CodeInfo");
  if (codeInfo) {
    fenceLines.add(state.doc.lineAt(codeInfo.from).number);
  }

  for (let lineNum = firstLine; lineNum <= lastLine; lineNum++) {
    const line = state.doc.line(lineNum);
    const isFenceLine = fenceLines.has(lineNum);

    if (isFenceLine) {
      if (!cursorInBlock) {
        // Hide fence lines when cursor is outside block
        decos.push(
          Decoration.line({ class: "cm-code-fence-hidden" }).range(line.from)
        );
        if (line.to > line.from) {
          decos.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(
              line.from,
              line.to
            )
          );
        }
      } else {
        // Dim fence lines when cursor is inside block
        decos.push(
          Decoration.line({ class: "cm-code-fence-visible" }).range(line.from)
        );
      }
    } else {
      // Code content line — always apply code background
      decos.push(
        Decoration.line({ class: "cm-code-block-line" }).range(line.from)
      );
    }
  }
}

function handleListItem(
  state: EditorState,
  node: { from: number; to: number; node: SyntaxNodeLike },
  cursorLines: Set<number>,
  isOrdered: boolean,
  decos: Range<Decoration>[]
) {
  const listMark = node.node.getChild("ListMark");
  if (!listMark) return;

  const markLine = state.doc.lineAt(listMark.from).number;
  if (cursorLines.has(markLine)) return;

  // Check for task marker (checkbox): "[ ]" or "[x]"
  const lineObj = state.doc.line(markLine);
  const afterMark = listMark.to;
  const restOfLine = state.sliceDoc(afterMark, Math.min(afterMark + 4, lineObj.to));
  const taskMatch = restOfLine.match(/^\s?\[([ xX])\]/);

  if (taskMatch) {
    // Task list item — hide marker + checkbox syntax, show widget
    const checked = taskMatch[1] !== " ";
    const taskEnd = afterMark + taskMatch[0].length;
    // Hide "- [ ] " or "- [x] "
    const hideEnd = Math.min(taskEnd + 1, lineObj.to);
    decos.push(
      Decoration.replace({
        widget: new CheckboxWidget(checked),
      }).range(listMark.from, hideEnd)
    );
  } else if (!isOrdered) {
    // Bullet list — hide marker, show bullet widget
    const hideEnd = Math.min(afterMark + 1, lineObj.to);
    decos.push(
      Decoration.replace({
        widget: new BulletWidget(),
      }).range(listMark.from, hideEnd)
    );
  }
  // Ordered lists: keep numbers visible (they're semantic)
}

// ── Main build function ──

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

      // ── Block elements (per-line cursor handling) ──

      if (type === "FencedCode") {
        handleFencedCode(state, node, cursorLines, decos);
        return false;
      }

      if (type === "Blockquote") {
        handleBlockquote(state, node, cursorLines, decos);
        return false;
      }

      // List items — handled individually for per-line cursor
      if (type === "ListItem") {
        const parent = node.node.parent;
        const isOrdered = parent?.type.name === "OrderedList";
        handleListItem(state, node, cursorLines, isOrdered, decos);
        // Don't return false — let children be processed for inline elements
      }

      // ── Inline elements (skip if on cursor line) ──

      if (nodeHasCursor(state, from, to, cursorLines)) return;

      if (/^ATXHeading(\d)$/.test(type)) {
        handleHeading(state, node, decos);
        return false;
      }

      if (type === "HorizontalRule") {
        handleHorizontalRule(from, to, decos);
        return false;
      }

      if (type === "StrongEmphasis") {
        handleStrongEmphasis(state, from, to, decos);
        return false;
      }

      if (type === "Emphasis") {
        handleEmphasis(state, from, to, decos);
        return false;
      }

      if (type === "InlineCode") {
        handleInlineCode(from, to, decos);
        return false;
      }

      if (type === "Link") {
        handleLink(node, decos);
        return false;
      }

      if (type === "Strikethrough") {
        handleStrikethrough(from, to, decos);
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
