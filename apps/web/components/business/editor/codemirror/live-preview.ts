import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { EditorState, Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

function buildDecorations(state: EditorState): DecorationSet {
  if (state.doc.length === 0) return Decoration.none;

  const decorations: Range<Decoration>[] = [];
  const cursorLines = new Set<number>();

  for (const range of state.selection.ranges) {
    if (range.from > state.doc.length || range.to > state.doc.length) continue;
    const lineFrom = state.doc.lineAt(range.from).number;
    const lineTo = state.doc.lineAt(range.to).number;
    for (let l = lineFrom; l <= lineTo; l++) {
      cursorLines.add(l);
    }
  }

  syntaxTree(state).iterate({
    enter(node) {
      const nodeFrom = node.from;
      const nodeTo = node.to;

      // Bounds check
      if (nodeFrom > state.doc.length || nodeTo > state.doc.length) return;
      if (nodeFrom === nodeTo) return;

      const lineStart = state.doc.lineAt(nodeFrom).number;
      const lineEnd = state.doc.lineAt(nodeTo).number;

      // Check if any line of this node has the cursor
      let hasCursor = false;
      for (let l = lineStart; l <= lineEnd; l++) {
        if (cursorLines.has(l)) {
          hasCursor = true;
          break;
        }
      }
      if (hasCursor) return;

      const type = node.type.name;

      // HorizontalRule: style the entire line
      if (type === "HorizontalRule") {
        decorations.push(
          Decoration.mark({ class: "cm-rendered-hr-line" }).range(nodeFrom, nodeTo)
        );
        return false;
      }

      // ATX Headings: hide the # markers, style the text
      if (/^ATXHeading(\d)$/.test(type)) {
        const level = parseInt(type.charAt(type.length - 1));
        const headerMark = node.node.getChild("HeaderMark");
        if (headerMark) {
          const markEnd = headerMark.to;
          const lineObj = state.doc.lineAt(nodeFrom);
          const afterMark = Math.min(markEnd + 1, lineObj.to);
          // Hide "# " prefix via CSS
          if (afterMark > nodeFrom) {
            decorations.push(
              Decoration.mark({ class: "cm-hide-syntax" }).range(nodeFrom, afterMark)
            );
          }
          // Apply heading style to the rest
          const className = `cm-heading-${level}`;
          if (afterMark < nodeTo) {
            decorations.push(
              Decoration.mark({ class: className }).range(afterMark, nodeTo)
            );
          }
        }
        return false;
      }

      // StrongEmphasis: hide ** markers
      if (type === "StrongEmphasis") {
        const text = state.sliceDoc(nodeFrom, nodeTo);
        const marker = text.startsWith("__") ? "__" : "**";
        const mLen = marker.length;
        if (nodeTo - nodeFrom > mLen * 2) {
          decorations.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(nodeFrom, nodeFrom + mLen)
          );
          decorations.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(nodeTo - mLen, nodeTo)
          );
          decorations.push(
            Decoration.mark({ class: "cm-rendered-bold" }).range(
              nodeFrom + mLen,
              nodeTo - mLen
            )
          );
        }
        return false;
      }

      // Emphasis: hide * markers
      if (type === "Emphasis") {
        const text = state.sliceDoc(nodeFrom, nodeTo);
        const marker = text.startsWith("_") ? "_" : "*";
        const mLen = marker.length;
        if (nodeTo - nodeFrom > mLen * 2) {
          decorations.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(nodeFrom, nodeFrom + mLen)
          );
          decorations.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(nodeTo - mLen, nodeTo)
          );
          decorations.push(
            Decoration.mark({ class: "cm-rendered-italic" }).range(
              nodeFrom + mLen,
              nodeTo - mLen
            )
          );
        }
        return false;
      }

      // InlineCode: hide backtick markers
      if (type === "InlineCode") {
        if (nodeTo - nodeFrom > 2) {
          decorations.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(nodeFrom, nodeFrom + 1)
          );
          decorations.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(nodeTo - 1, nodeTo)
          );
          decorations.push(
            Decoration.mark({ class: "cm-rendered-code" }).range(
              nodeFrom + 1,
              nodeTo - 1
            )
          );
        }
        return false;
      }

      // Links: [text](url) → hide syntax, style text
      if (type === "Link") {
        const linkMarks = node.node.getChildren("LinkMark");
        const urlNode = node.node.getChild("URL");
        if (linkMarks.length >= 2 && urlNode) {
          const textStart = linkMarks[0].to; // after [
          const textEnd = linkMarks[1].from; // before ](
          const urlEnd = nodeTo; // includes )

          // Hide [
          decorations.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(nodeFrom, textStart)
          );
          // Style the link text
          decorations.push(
            Decoration.mark({ class: "cm-rendered-link" }).range(
              textStart,
              textEnd
            )
          );
          // Hide ](url)
          decorations.push(
            Decoration.mark({ class: "cm-hide-syntax" }).range(textEnd, urlEnd)
          );
        }
        return false;
      }
    },
  });

  decorations.sort((a, b) => a.from - b.from);
  return Decoration.set(decorations);
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
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged
      ) {
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
