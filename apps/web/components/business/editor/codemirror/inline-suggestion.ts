/**
 * インラインサジェスション — VS Code Copilot風のインラインDiff表示
 *
 * AI結果を対象範囲の直下にウィジェットとして表示し、
 * ユーザーが「適用」「却下」を選択できる。
 */
import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
} from "@codemirror/view";
import { StateField, StateEffect, Facet } from "@codemirror/state";

export interface InlineSuggestion {
  from: number;
  to: number;
  original: string;
  suggested: string;
}

// サジェスションの追加・クリア用Effect
export const addSuggestionEffect = StateEffect.define<InlineSuggestion>();
export const clearSuggestionEffect = StateEffect.define<void>();

// 適用/却下コールバック用Facet
export const suggestionCallbackFacet = Facet.define<
  ((action: "accept" | "reject", suggestion: InlineSuggestion) => void) | null,
  ((action: "accept" | "reject", suggestion: InlineSuggestion) => void) | null
>({
  combine: (values) => values.find((v) => v != null) ?? null,
});

class SuggestionWidget extends WidgetType {
  constructor(
    readonly suggestion: InlineSuggestion,
  ) {
    super();
  }

  toDOM(view: EditorView) {
    const container = document.createElement("div");
    container.className = "cm-inline-suggestion";

    // 原文（削除表示）
    const delRow = document.createElement("div");
    delRow.className = "cm-suggestion-del-row";
    const delLabel = document.createElement("span");
    delLabel.className = "cm-suggestion-label cm-suggestion-label-del";
    delLabel.textContent = "原文";
    const delText = document.createElement("span");
    delText.className = "cm-suggestion-text cm-suggestion-text-del";
    delText.textContent = this.suggestion.original;
    delRow.appendChild(delLabel);
    delRow.appendChild(delText);

    // 修正案（挿入表示）
    const insRow = document.createElement("div");
    insRow.className = "cm-suggestion-ins-row";
    const insLabel = document.createElement("span");
    insLabel.className = "cm-suggestion-label cm-suggestion-label-ins";
    insLabel.textContent = "修正";
    const insText = document.createElement("span");
    insText.className = "cm-suggestion-text cm-suggestion-text-ins";
    insText.textContent = this.suggestion.suggested;
    insRow.appendChild(insLabel);
    insRow.appendChild(insText);

    // ボタン行
    const btnRow = document.createElement("div");
    btnRow.className = "cm-suggestion-buttons";

    const acceptBtn = document.createElement("button");
    acceptBtn.className = "cm-suggestion-btn cm-suggestion-btn-accept";
    acceptBtn.textContent = "適用";
    acceptBtn.type = "button";
    acceptBtn.onmousedown = (e) => {
      e.preventDefault();
      const callback = view.state.facet(suggestionCallbackFacet);
      if (callback) callback("accept", this.suggestion);
    };

    const rejectBtn = document.createElement("button");
    rejectBtn.className = "cm-suggestion-btn cm-suggestion-btn-reject";
    rejectBtn.textContent = "却下";
    rejectBtn.type = "button";
    rejectBtn.onmousedown = (e) => {
      e.preventDefault();
      const callback = view.state.facet(suggestionCallbackFacet);
      if (callback) callback("reject", this.suggestion);
    };

    btnRow.appendChild(acceptBtn);
    btnRow.appendChild(rejectBtn);

    container.appendChild(delRow);
    container.appendChild(insRow);
    container.appendChild(btnRow);

    return container;
  }

  eq(other: SuggestionWidget) {
    return (
      this.suggestion.from === other.suggestion.from &&
      this.suggestion.to === other.suggestion.to &&
      this.suggestion.suggested === other.suggestion.suggested
    );
  }

  ignoreEvent() {
    return false;
  }
}

export const inlineSuggestionField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    // Effect処理
    for (const effect of tr.effects) {
      if (effect.is(addSuggestionEffect)) {
        const s = effect.value;
        // 対象範囲にハイライト + 直後にウィジェット
        const highlight = Decoration.mark({
          class: "cm-suggestion-highlight",
        }).range(s.from, s.to);
        const widget = Decoration.widget({
          widget: new SuggestionWidget(s),
          side: 1,
          block: true,
        }).range(s.to);
        return Decoration.set([highlight, widget]);
      }
      if (effect.is(clearSuggestionEffect)) {
        return Decoration.none;
      }
    }
    // ドキュメント変更時にサジェスションをクリア
    if (tr.docChanged) {
      return Decoration.none;
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});
