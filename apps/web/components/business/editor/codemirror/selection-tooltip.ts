import {
  EditorView,
  showTooltip,
  type Tooltip,
} from "@codemirror/view";
import { StateField, Facet } from "@codemirror/state";

interface SelectionAction {
  action: string;
  label: string;
}

const ACTIONS: SelectionAction[] = [
  { action: "proofread", label: "校正" },
  { action: "rewrite", label: "書き換え" },
  { action: "to-markdown", label: "MD変換" },
  { action: "summarize", label: "要約" },
  { action: "continue", label: "続きを書く" },
];

// コールバックを外部から注入するためのFacet
export const aiRequestCallbackFacet = Facet.define<
  ((req: { action: string; selectedText: string; selectionRange: { from: number; to: number } }) => void) | null,
  ((req: { action: string; selectedText: string; selectionRange: { from: number; to: number } }) => void) | null
>({
  combine: (values) => values.find((v) => v != null) ?? null,
});

function getSelectionTooltip(state: EditorView["state"]): Tooltip | null {
  const { from, to } = state.selection.main;
  if (from === to) return null;

  // 選択が短すぎる場合はツールチップを出さない
  const selectedText = state.sliceDoc(from, to);
  if (selectedText.trim().length < 2) return null;

  return {
    pos: from,
    above: true,
    strictSide: true,
    arrow: false,
    create: (view) => {
      const dom = document.createElement("div");
      dom.className = "cm-ai-selection-bar";

      for (const { action, label } of ACTIONS) {
        const btn = document.createElement("button");
        btn.className = "cm-ai-selection-btn";
        btn.textContent = label;
        btn.type = "button";
        btn.onmousedown = (e) => {
          e.preventDefault(); // 選択解除を防ぐ
          const callback = view.state.facet(aiRequestCallbackFacet);
          if (callback) {
            const sel = view.state.selection.main;
            callback({
              action,
              selectedText: view.state.sliceDoc(sel.from, sel.to),
              selectionRange: { from: sel.from, to: sel.to },
            });
          }
        };
        dom.appendChild(btn);
      }

      return { dom };
    },
  };
}

export const selectionTooltipField = StateField.define<Tooltip | null>({
  create: (state) => getSelectionTooltip(state),
  update: (value, tr) => {
    if (!tr.docChanged && !tr.selection) return value;
    return getSelectionTooltip(tr.state);
  },
  provide: (f) => showTooltip.from(f),
});
