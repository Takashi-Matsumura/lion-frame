import { KeyBinding } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

function toggleWrap(marker: string) {
  return ({ state, dispatch }: { state: any; dispatch: any }) => {
    const changes = state.changeByRange((range: any) => {
      const text = state.sliceDoc(range.from, range.to);
      const len = marker.length;

      if (
        text.startsWith(marker) &&
        text.endsWith(marker) &&
        text.length >= len * 2
      ) {
        // Remove markers
        return {
          changes: [
            { from: range.from, to: range.from + len, insert: "" },
            { from: range.to - len, to: range.to, insert: "" },
          ],
          range: EditorSelection.range(range.from, range.to - len * 2),
        };
      }

      // Check if markers exist outside the selection
      const before = state.sliceDoc(range.from - len, range.from);
      const after = state.sliceDoc(range.to, range.to + len);
      if (before === marker && after === marker) {
        return {
          changes: [
            { from: range.from - len, to: range.from, insert: "" },
            { from: range.to, to: range.to + len, insert: "" },
          ],
          range: EditorSelection.range(range.from - len, range.to - len),
        };
      }

      // Add markers
      return {
        changes: [
          { from: range.from, insert: marker },
          { from: range.to, insert: marker },
        ],
        range: EditorSelection.range(
          range.from + len,
          range.to + len
        ),
      };
    });

    dispatch(state.update(changes, { userEvent: "input.format" }));
    return true;
  };
}

function insertCodeBlock() {
  return ({ state, dispatch }: { state: any; dispatch: any }) => {
    const changes = state.changeByRange((range: any) => {
      const text = state.sliceDoc(range.from, range.to);
      const line = state.doc.lineAt(range.from);
      const needsNewlineBefore = range.from > line.from ? "\n" : "";

      if (text) {
        const insert = `${needsNewlineBefore}\`\`\`\n${text}\n\`\`\`\n`;
        const offset = needsNewlineBefore.length + 4; // ``` + \n
        return {
          changes: { from: range.from, to: range.to, insert },
          range: EditorSelection.range(
            range.from + offset,
            range.from + offset + text.length
          ),
        };
      }

      const insert = `${needsNewlineBefore}\`\`\`\n\n\`\`\`\n`;
      const cursorPos = range.from + needsNewlineBefore.length + 4;
      return {
        changes: { from: range.from, insert },
        range: EditorSelection.cursor(cursorPos),
      };
    });
    dispatch(state.update(changes, { userEvent: "input.format" }));
    return true;
  };
}

function insertLink() {
  return ({ state, dispatch }: { state: any; dispatch: any }) => {
    const changes = state.changeByRange((range: any) => {
      const text = state.sliceDoc(range.from, range.to);
      if (text) {
        const insert = `[${text}](url)`;
        return {
          changes: { from: range.from, to: range.to, insert },
          range: EditorSelection.range(
            range.from + text.length + 3,
            range.from + text.length + 6
          ),
        };
      }
      const insert = "[](url)";
      return {
        changes: { from: range.from, insert },
        range: EditorSelection.cursor(range.from + 1),
      };
    });
    dispatch(state.update(changes, { userEvent: "input.format" }));
    return true;
  };
}

export const markdownKeymap: KeyBinding[] = [
  { key: "Mod-b", run: toggleWrap("**") },
  { key: "Mod-i", run: toggleWrap("*") },
  { key: "Mod-e", run: toggleWrap("`") },
  { key: "Mod-k", run: insertLink() },
  { key: "Mod-Shift-e", run: insertCodeBlock() },
];
