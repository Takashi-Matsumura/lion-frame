/**
 * ハンズオン Markdownパーサー
 *
 * マークダウン教材をセクション/ステップ/コードブロックに分割し、
 * インタラクティブ要素（OK/Errorボタン、チェックポイント）の挿入位置を特定する。
 *
 * パースルール:
 * - `---` (水平線) でセクション分割
 * - `### N-N.` パターンでステップ識別
 * - `### コラム：` で折りたたみコラム
 * - フェンスコードブロックにグローバルインデックス付与
 */

export interface HandsonCodeBlock {
  code: string;
  language: string;
  globalIndex: number;
}

export interface HandsonStep {
  id: string; // "1-1", "2-3" etc
  heading: string;
  contentMarkdown: string;
  codeBlocks: HandsonCodeBlock[];
}

export interface HandsonColumn {
  title: string;
  contentMarkdown: string;
}

export interface HandsonSection {
  index: number;
  type: "body" | "column";
  steps: HandsonStep[];
  columns: HandsonColumn[];
  // ステップに属さない先頭コンテンツ
  introMarkdown: string;
  introCodeBlocks: HandsonCodeBlock[];
}

export interface ParsedHandson {
  sections: HandsonSection[];
  totalCommands: number;
}

const STEP_PATTERN = /^###\s+(\d+-\d+)\.\s+(.+)$/;
const COLUMN_PATTERN = /^###\s+コラム[：:]\s*(.+)$/;
const CODE_FENCE_PATTERN = /^```([^\n]*)\n([\s\S]*?)^```/gm;

function extractCodeBlocks(
  content: string,
  startIndex: number,
): { codeBlocks: HandsonCodeBlock[]; nextIndex: number } {
  const codeBlocks: HandsonCodeBlock[] = [];
  let currentIndex = startIndex;

  const regex = new RegExp(CODE_FENCE_PATTERN.source, "gm");
  let match;
  while ((match = regex.exec(content)) !== null) {
    codeBlocks.push({
      code: match[2].trimEnd(),
      language: match[1].trim() || "text",
      globalIndex: currentIndex,
    });
    currentIndex++;
  }

  return { codeBlocks, nextIndex: currentIndex };
}

function splitBySteps(
  content: string,
): { intro: string; steps: { id: string; heading: string; content: string }[] } {
  const lines = content.split("\n");
  const steps: { id: string; heading: string; content: string; startLine: number }[] = [];
  let intro = "";

  // まずステップの開始位置を特定
  const stepStarts: { id: string; heading: string; lineIndex: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(STEP_PATTERN);
    if (match) {
      stepStarts.push({ id: match[1], heading: match[2], lineIndex: i });
    }
  }

  if (stepStarts.length === 0) {
    return { intro: content, steps: [] };
  }

  // ステップ前のイントロ
  intro = lines.slice(0, stepStarts[0].lineIndex).join("\n").trim();

  // 各ステップのコンテンツを切り出し
  for (let i = 0; i < stepStarts.length; i++) {
    const start = stepStarts[i].lineIndex;
    const end = i + 1 < stepStarts.length ? stepStarts[i + 1].lineIndex : lines.length;
    const stepContent = lines.slice(start, end).join("\n").trim();
    steps.push({
      id: stepStarts[i].id,
      heading: stepStarts[i].heading,
      content: stepContent,
      startLine: start,
    });
  }

  return { intro, steps };
}

function isColumnSection(content: string): boolean {
  const firstLine = content.split("\n")[0];
  return COLUMN_PATTERN.test(firstLine);
}

function extractColumnTitle(content: string): string {
  const match = content.match(COLUMN_PATTERN);
  return match ? match[1] : "コラム";
}

function removeColumnHeading(content: string): string {
  return content.replace(/^###\s+コラム[：:].*$/m, "").trim();
}

export function parseHandsonMarkdown(markdown: string): ParsedHandson {
  // セクション分割 (---で区切る)
  const rawSections = markdown.split(/^---$/m);
  const sections: HandsonSection[] = [];
  let globalCommandIndex = 0;

  for (let i = 0; i < rawSections.length; i++) {
    const raw = rawSections[i].trim();
    if (!raw) continue;

    if (isColumnSection(raw)) {
      // コラムセクション
      const title = extractColumnTitle(raw);
      const contentMarkdown = removeColumnHeading(raw);
      sections.push({
        index: sections.length,
        type: "column",
        steps: [],
        columns: [{ title, contentMarkdown }],
        introMarkdown: "",
        introCodeBlocks: [],
      });
      continue;
    }

    // ボディセクション
    const { intro, steps: rawSteps } = splitBySteps(raw);
    const section: HandsonSection = {
      index: sections.length,
      type: "body",
      steps: [],
      columns: [],
      introMarkdown: "",
      introCodeBlocks: [],
    };

    // イントロ部分
    if (intro) {
      const { codeBlocks, nextIndex } = extractCodeBlocks(intro, globalCommandIndex);
      section.introMarkdown = intro;
      section.introCodeBlocks = codeBlocks;
      globalCommandIndex = nextIndex;
    }

    // ステップ
    for (const rawStep of rawSteps) {
      const { codeBlocks, nextIndex } = extractCodeBlocks(
        rawStep.content,
        globalCommandIndex,
      );
      section.steps.push({
        id: rawStep.id,
        heading: rawStep.heading,
        contentMarkdown: rawStep.content,
        codeBlocks,
      });
      globalCommandIndex = nextIndex;
    }

    sections.push(section);
  }

  return {
    sections,
    totalCommands: globalCommandIndex,
  };
}
