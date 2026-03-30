"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import CommandStatusButtons from "./CommandStatusButtons";
import { handsonTranslations } from "./translations";
import type { Language } from "./types";
import type { ParsedHandson, HandsonSection, HandsonStep } from "@/lib/addon-modules/handson/markdown-parser";

interface Props {
  language: Language;
  parsed: ParsedHandson;
  readOnly?: boolean;
  onCommandReport?: (commandIndex: number, status: "ok" | "error") => Promise<void>;
  /** 講師プレビューモード: コードブロック下にチェックポイントボタンを表示 */
  onInstructorCheckpoint?: (commandIndex: number) => Promise<void>;
  /** 既存の回答状態（リロード復旧用） */
  initialStatuses?: Record<number, "ok" | "error">;
}

export default function HandsonMarkdownRenderer({
  language,
  parsed,
  readOnly = false,
  onCommandReport,
  onInstructorCheckpoint,
  initialStatuses,
}: Props) {
  const t = handsonTranslations[language].markdownRenderer;

  return (
    <div className="handson-article">
      {parsed.sections.map((section) =>
        section.type === "column" ? (
          <ColumnSection
            key={section.index}
            section={section}
            language={language}
            expandLabel={t.clickToExpand}
          />
        ) : (
          <BodySection
            key={section.index}
            section={section}
            language={language}
            readOnly={readOnly}
            onCommandReport={onCommandReport}
            onInstructorCheckpoint={onInstructorCheckpoint}
            initialStatuses={initialStatuses}
          />
        ),
      )}
    </div>
  );
}

// === コラムセクション ===
function ColumnSection({
  section,
  language,
  expandLabel,
}: {
  section: HandsonSection;
  language: Language;
  expandLabel: string;
}) {
  return (
    <>
      {section.columns.map((col, i) => (
        <details
          key={i}
          className="group my-10 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
          data-section-index={section.index}
        >
          <summary className="flex cursor-pointer items-center gap-2 px-6 py-4 text-base font-semibold text-amber-900 select-none dark:text-amber-200">
            <svg
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {handsonTranslations[language].markdownRenderer.column}{col.title}
            <span className="ml-auto text-xs font-normal text-amber-600 dark:text-amber-400">
              {expandLabel}
            </span>
          </summary>
          <div className="border-t border-amber-200 px-8 py-1 dark:border-amber-900">
            <div className="prose prose-zinc max-w-none dark:prose-invert handson-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {col.contentMarkdown}
              </ReactMarkdown>
            </div>
          </div>
        </details>
      ))}
    </>
  );
}

// === ボディセクション ===
function BodySection({
  section,
  language,
  readOnly,
  onCommandReport,
  onInstructorCheckpoint,
  initialStatuses,
}: {
  section: HandsonSection;
  language: Language;
  readOnly: boolean;
  onCommandReport?: (commandIndex: number, status: "ok" | "error") => Promise<void>;
  onInstructorCheckpoint?: (commandIndex: number) => Promise<void>;
  initialStatuses?: Record<number, "ok" | "error">;
}) {
  return (
    <div data-section-index={section.index}>
      {/* イントロ部分（ナンバリング対象外） */}
      {section.introMarkdown && (
        <div className="prose prose-zinc max-w-none dark:prose-invert handson-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {section.introMarkdown}
          </ReactMarkdown>
        </div>
      )}

      {/* ステップ */}
      {section.steps.map((step) => (
        <StepContent
          key={step.id}
          step={step}
          language={language}
          readOnly={readOnly}
          onCommandReport={onCommandReport}
          onInstructorCheckpoint={onInstructorCheckpoint}
          initialStatuses={initialStatuses}
        />
      ))}
    </div>
  );
}

// === コンテンツパーツ（テキストとコードブロックを交互に表示） ===
type ContentPart = {
  type: "markdown" | "codeblock";
  content: string;
  globalIndex?: number; // コードブロックの場合のみ
};

/**
 * Markdownテキストをコードブロックとテキスト部分に分割する。
 * 参考リポジトリの splitByCodeBlocks と同じアプローチ。
 */
function splitByCodeBlocks(
  content: string,
  codeBlocks: { code: string; language: string; globalIndex: number }[],
): ContentPart[] {
  const parts: ContentPart[] = [];
  const regex = /^(```[^\n]*\n[\s\S]*?^```)/gm;
  let lastIndex = 0;
  let codeBlockIdx = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index).trim();
    if (before) {
      parts.push({ type: "markdown", content: before });
    }
    const cb = codeBlocks[codeBlockIdx];
    parts.push({
      type: "codeblock",
      content: match[1],
      globalIndex: cb?.globalIndex,
    });
    codeBlockIdx++;
    lastIndex = match.index + match[0].length;
  }

  const after = content.slice(lastIndex).trim();
  if (after) {
    parts.push({ type: "markdown", content: after });
  }

  return parts;
}

// === ステップコンテンツ ===
function StepContent({
  step,
  language,
  readOnly,
  onCommandReport,
  onInstructorCheckpoint,
  initialStatuses,
}: {
  step: HandsonStep;
  language: Language;
  readOnly: boolean;
  onCommandReport?: (commandIndex: number, status: "ok" | "error") => Promise<void>;
  onInstructorCheckpoint?: (commandIndex: number) => Promise<void>;
  initialStatuses?: Record<number, "ok" | "error">;
}) {
  const parts = splitByCodeBlocks(step.contentMarkdown, step.codeBlocks);

  return (
    <div id={`step-${step.id}`}>
      {parts.map((part, i) => {
        if (part.type === "codeblock") {
          return (
            <div key={i} id={part.globalIndex !== undefined ? `handson-cmd-${part.globalIndex}` : undefined}>
              <div className="prose prose-zinc max-w-none dark:prose-invert handson-prose overflow-visible">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {part.content}
                </ReactMarkdown>
              </div>
              {/* 受講者: OK/Errorボタン */}
              {!readOnly && onCommandReport && part.globalIndex !== undefined && (
                <CommandStatusButtons
                  language={language}
                  globalNumber={part.globalIndex + 1}
                  initialStatus={initialStatuses?.[part.globalIndex] ?? null}
                  onReport={async (status) => {
                    await onCommandReport(part.globalIndex!, status);
                  }}
                />
              )}
              {/* 講師: チェックポイントボタン */}
              {onInstructorCheckpoint && part.globalIndex !== undefined && (
                <InstructorCheckpointButton
                  language={language}
                  globalNumber={part.globalIndex + 1}
                  onCheckpoint={async () => {
                    await onInstructorCheckpoint(part.globalIndex!);
                  }}
                />
              )}
            </div>
          );
        }
        return (
          <div key={i} className="prose prose-zinc max-w-none dark:prose-invert handson-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {part.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}

// === 講師チェックポイントボタン ===
function InstructorCheckpointButton({
  language,
  globalNumber,
  onCheckpoint,
}: {
  language: Language;
  globalNumber: number;
  onCheckpoint: () => Promise<void>;
}) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (done || loading) return;
    setLoading(true);
    try {
      await onCheckpoint();
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  const label = `#${globalNumber}`;

  if (done) {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
        <span className="font-mono text-xs text-muted-foreground">{label}</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {handsonTranslations[language].markdownRenderer.checked}
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {loading
          ? handsonTranslations[language].common.sending
          : handsonTranslations[language].markdownRenderer.checkpoint}
      </button>
    </div>
  );
}
