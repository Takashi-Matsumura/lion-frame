import { EditorState, Compartment, Extension } from "@codemirror/state";
import {
  EditorView,
  keymap,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  highlightSpecialChars,
} from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { GFM, Emoji } from "@lezer/markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { obsidianTheme, obsidianHighlighting } from "./theme";
import { livePreviewPlugin, tableDecorationField } from "./live-preview";
import { markdownKeymap } from "./keybindings";
import { imeSupport } from "./ime-support";

export const livePreviewCompartment = new Compartment();
export const tablePreviewCompartment = new Compartment();

export function createEditorState(
  doc: string,
  onChange: (doc: string) => void,
  livePreview: boolean = true,
  readOnly: boolean = false
): EditorState {
  const extensions: Extension[] = [
    highlightSpecialChars(),
    history(),
    drawSelection(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    keymap.of([...markdownKeymap, ...defaultKeymap, ...historyKeymap]),
    markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [...GFM, Emoji] }),
    EditorView.lineWrapping,
    obsidianTheme,
    obsidianHighlighting,
    tablePreviewCompartment.of(livePreview ? tableDecorationField : []),
    livePreviewCompartment.of(livePreview ? livePreviewPlugin : []),
    imeSupport,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString();
        Promise.resolve().then(() => onChange(content));
      }
    }),
  ];

  if (readOnly) {
    extensions.push(EditorState.readOnly.of(true));
    extensions.push(EditorView.editable.of(false));
  }

  return EditorState.create({ doc, extensions });
}
