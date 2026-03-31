import {
  autocompletion,
  type CompletionContext,
  type Completion,
} from "@codemirror/autocomplete";

interface SlashTemplate {
  label: string;
  displayLabel: string;
  detail: string;
  template: string;
  cursorOffset?: number; // offset from end of inserted text
}

const slashTemplates: SlashTemplate[] = [
  {
    label: "/table",
    displayLabel: "/table",
    detail: "テーブル",
    template: "| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| | | |\n| | | |",
    cursorOffset: -30, // position at first empty cell
  },
  {
    label: "/code",
    displayLabel: "/code",
    detail: "コードブロック",
    template: "```\n\n```",
    cursorOffset: -4,
  },
  {
    label: "/list",
    displayLabel: "/list",
    detail: "箇条書き",
    template: "- \n- \n- ",
    cursorOffset: -6,
  },
  {
    label: "/checklist",
    displayLabel: "/checklist",
    detail: "チェックリスト",
    template: "- [ ] \n- [ ] \n- [ ] ",
    cursorOffset: -16,
  },
  {
    label: "/link",
    displayLabel: "/link",
    detail: "リンク",
    template: "[リンクテキスト](url)",
    cursorOffset: -1, // position on "url"
  },
  {
    label: "/image",
    displayLabel: "/image",
    detail: "画像",
    template: "![代替テキスト](url)",
    cursorOffset: -1,
  },
  {
    label: "/h1",
    displayLabel: "/h1",
    detail: "見出し H1",
    template: "# ",
  },
  {
    label: "/h2",
    displayLabel: "/h2",
    detail: "見出し H2",
    template: "## ",
  },
  {
    label: "/h3",
    displayLabel: "/h3",
    detail: "見出し H3",
    template: "### ",
  },
  {
    label: "/quote",
    displayLabel: "/quote",
    detail: "引用",
    template: "> ",
  },
  {
    label: "/hr",
    displayLabel: "/hr",
    detail: "水平線",
    template: "---\n",
  },
];

function slashCompletionSource(context: CompletionContext) {
  // Match "/" at the beginning of a line, optionally followed by more chars
  const line = context.state.doc.lineAt(context.pos);
  const textBefore = line.text.slice(0, context.pos - line.from);

  // Only trigger when "/" is at the start of the line
  const match = textBefore.match(/^\/(\w*)$/);
  if (!match) return null;

  const from = line.from;
  const filter = match[1].toLowerCase();

  const completions: Completion[] = slashTemplates
    .filter(
      (t) =>
        !filter || t.label.slice(1).toLowerCase().startsWith(filter)
    )
    .map((t) => ({
      label: t.label,
      displayLabel: t.displayLabel,
      detail: t.detail,
      type: "text",
      apply: (view, completion, from, to) => {
        const insert = t.template;
        view.dispatch({
          changes: { from, to, insert },
          selection: {
            anchor: t.cursorOffset
              ? from + insert.length + t.cursorOffset
              : from + insert.length,
          },
        });
      },
    }));

  if (completions.length === 0) return null;

  return {
    from,
    options: completions,
    filter: false, // we handle filtering ourselves
  };
}

export const slashCommands = autocompletion({
  override: [slashCompletionSource],
  defaultKeymap: true,
  icons: false,
  optionClass: () => "cm-slash-option",
  closeOnBlur: true,
});
