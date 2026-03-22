import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

/**
 * 全角マークダウン記号 → 半角自動変換 + 行頭記法後の半角スペース自動挿入
 *
 * 日本語IMEモードのまま入力された全角のマークダウン記号を
 * 半角に自動変換し、IME切替の手間を解消する。
 * さらに、見出し(#)・引用(>)・リスト(-)の後に半角スペースがなければ自動挿入する。
 */

const FULLWIDTH_TO_HALFWIDTH: Record<string, string> = {
  "＃": "#",
  "＊": "*",
  "－": "-",
  "ー": "-",
  "＞": ">",
  "｀": "`",
  "｜": "|",
  "［": "[",
  "］": "]",
  "（": "(",
  "）": ")",
  "～": "~",
};

const FULLWIDTH_CHARS = Object.keys(FULLWIDTH_TO_HALFWIDTH);
const FULLWIDTH_PATTERN = new RegExp(
  `[${FULLWIDTH_CHARS.join("")}]`,
  "g"
);

function shouldConvert(char: string, lineText: string, posInLine: number): boolean {
  const halfChar = FULLWIDTH_TO_HALFWIDTH[char];
  if (!halfChar) return false;

  switch (halfChar) {
    case "#": {
      const before = lineText.slice(0, posInLine);
      return /^[#＃\s]*$/.test(before);
    }
    case ">": {
      const before = lineText.slice(0, posInLine);
      return /^[>＞\s]*$/.test(before);
    }
    case "-": {
      const before = lineText.slice(0, posInLine);
      return /^[\s\-－ー]*$/.test(before);
    }
    case "*":
    case "`":
    case "|":
    case "[":
    case "]":
    case "(":
    case ")":
    case "~":
      return true;
    default:
      return false;
  }
}

/**
 * 指定行をスキャンし、全角→半角変換 + 行頭記法後のスペース自動挿入
 */
function scanAndConvert(view: EditorView, lineNumbers: Set<number>) {
  const { state } = view;
  const changes: { from: number; to: number; insert: string }[] = [];

  // ステップ1: 全角→半角変換
  for (const lineNum of lineNumbers) {
    if (lineNum < 1 || lineNum > state.doc.lines) continue;
    const line = state.doc.line(lineNum);
    const text = line.text;

    if (!FULLWIDTH_PATTERN.test(text)) continue;
    FULLWIDTH_PATTERN.lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const halfChar = FULLWIDTH_TO_HALFWIDTH[char];
      if (!halfChar) continue;

      if (shouldConvert(char, text, i)) {
        changes.push({
          from: line.from + i,
          to: line.from + i + 1,
          insert: halfChar,
        });
      }
    }
  }

  if (changes.length > 0) {
    view.dispatch({ changes });

    // ステップ2: 行頭記法の後に半角スペースを自動挿入
    // 全角→半角変換が実際に行われた場合のみ実行する。
    // 通常の日本語テキスト確定時にカーソル位置が狂うのを防ぐ。
    autoInsertSpace(view, lineNumbers);
  }
}

/**
 * 行頭のマークダウン記法の後にスペースがなければ自動挿入する。
 *
 * 対象パターン:
 *   ^#{1,6}[^ ]  → "## " のようにスペースを挿入
 *   ^>[^ ]       → "> " のようにスペースを挿入
 *   ^-[^ ]       → "- " のようにスペースを挿入
 *
 * カーソルが記法の直後にある場合のみ発動（入力直後の状態）。
 */
function autoInsertSpace(view: EditorView, lineNumbers: Set<number>) {
  const { state } = view;
  const cursorPos = state.selection.main.head;
  const changes: { from: number; to: number; insert: string }[] = [];
  let newCursorPos = cursorPos;

  for (const lineNum of lineNumbers) {
    if (lineNum < 1 || lineNum > state.doc.lines) continue;
    const line = state.doc.line(lineNum);
    const text = line.text;

    // 見出し: ^#{1,6} の後にスペースがない、かつカーソルが行末にある
    const headingMatch = text.match(/^(#{1,6})([^ \t]|$)/);
    if (headingMatch) {
      const insertPos = line.from + headingMatch[1].length;
      // カーソルが見出し記号の直後にある場合のみ
      if (cursorPos === insertPos || cursorPos === line.to) {
        // 行が "##" だけ、または "##何か"（スペースなし）の場合
        if (text.length === headingMatch[1].length || headingMatch[2] !== "") {
          changes.push({ from: insertPos, to: insertPos, insert: " " });
          if (cursorPos >= insertPos) {
            newCursorPos = insertPos + 1;
          }
        }
      }
      continue;
    }

    // 引用: ^> の後にスペースがない
    const quoteMatch = text.match(/^(>)([^ \t]|$)/);
    if (quoteMatch) {
      const insertPos = line.from + 1;
      if (cursorPos === insertPos || cursorPos === line.to) {
        if (text.length === 1 || quoteMatch[2] !== "") {
          changes.push({ from: insertPos, to: insertPos, insert: " " });
          if (cursorPos >= insertPos) {
            newCursorPos = insertPos + 1;
          }
        }
      }
      continue;
    }

    // リスト: ^- の後にスペースがない
    const listMatch = text.match(/^(-)([^ \t]|$)/);
    if (listMatch) {
      const insertPos = line.from + 1;
      if (cursorPos === insertPos || cursorPos === line.to) {
        if (text.length === 1 || listMatch[2] !== "") {
          changes.push({ from: insertPos, to: insertPos, insert: " " });
          if (cursorPos >= insertPos) {
            newCursorPos = insertPos + 1;
          }
        }
      }
      continue;
    }
  }

  if (changes.length > 0) {
    view.dispatch({
      changes,
      selection: EditorSelection.cursor(newCursorPos),
    });
  }
}

/**
 * IME確定時に compositionend イベントでカーソル行をスキャンする拡張。
 * ペースト等の非IME入力にも対応する。
 */
export const imeSupport = EditorView.domEventHandlers({
  compositionend(_event, view) {
    setTimeout(() => {
      const { state } = view;
      const lines = new Set<number>();
      for (const range of state.selection.ranges) {
        const from = state.doc.lineAt(range.from).number;
        const to = state.doc.lineAt(range.to).number;
        for (let l = from; l <= to; l++) {
          lines.add(l);
        }
      }
      scanAndConvert(view, lines);
    }, 20);
  },

  paste(_event, view) {
    setTimeout(() => {
      const { state } = view;
      const lines = new Set<number>();
      for (let l = 1; l <= state.doc.lines; l++) {
        lines.add(l);
      }
      scanAndConvert(view, lines);
    }, 20);
  },
});
