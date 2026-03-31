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
import { livePreviewPlugin, tableDecorationField, editorFocusField, focusTracker } from "./live-preview";
import { markdownKeymap } from "./keybindings";
import { imeSupport } from "./ime-support";
import { slashCommands } from "./slash-commands";
import { selectionTooltipField, aiRequestCallbackFacet } from "./selection-tooltip";

export const livePreviewCompartment = new Compartment();
export const tablePreviewCompartment = new Compartment();
export const selectionTooltipCompartment = new Compartment();

export function createEditorState(
  doc: string,
  onChange: (doc: string) => void,
  livePreview: boolean = true,
  readOnly: boolean = false,
  aiRequestCallback?: ((req: { action: string; selectedText: string; selectionRange: { from: number; to: number } }) => void) | null,
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
    editorFocusField,
    focusTracker,
    tablePreviewCompartment.of(livePreview ? tableDecorationField : []),
    livePreviewCompartment.of(livePreview ? livePreviewPlugin : []),
    imeSupport,
    slashCommands,
    selectionTooltipCompartment.of(
      aiRequestCallback
        ? [aiRequestCallbackFacet.of(aiRequestCallback), selectionTooltipField]
        : [],
    ),
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
