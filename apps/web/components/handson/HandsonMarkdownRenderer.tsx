"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CommandStatusButtons from "./CommandStatusButtons";
import type { ParsedHandson, HandsonSection, HandsonStep } from "@/lib/addon-modules/handson/markdown-parser";

const translations = {
  en: {
    clickToExpand: "Click to expand",
    copied: "Copied!",
    copy: "Copy",
  },
  ja: {
    clickToExpand: "クリックで展開",
    copied: "コピーしました",
    copy: "コピー",
  },
};

interface Props {
  language: "en" | "ja";
  parsed: ParsedHandson;
  readOnly?: boolean;
  onCommandReport?: (commandIndex: number, status: "ok" | "error") => Promise<void>;
}

export default function HandsonMarkdownRenderer({
  language,
  parsed,
  readOnly = false,
  onCommandReport,
}: Props) {
  const t = translations[language];

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
  language: "en" | "ja";
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
            {language === "ja" ? "コラム：" : "Column: "}{col.title}
            <span className="ml-auto text-xs font-normal text-amber-600 dark:text-amber-400">
              {expandLabel}
            </span>
          </summary>
          <div className="border-t border-amber-200 px-8 py-1 dark:border-amber-900">
            <div className="prose prose-zinc max-w-none dark:prose-invert handson-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
}: {
  section: HandsonSection;
  language: "en" | "ja";
  readOnly: boolean;
  onCommandReport?: (commandIndex: number, status: "ok" | "error") => Promise<void>;
}) {
  return (
    <div data-section-index={section.index}>
      {/* イントロ部分（ナンバリング対象外） */}
      {section.introMarkdown && (
        <div className="prose prose-zinc max-w-none dark:prose-invert handson-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
}: {
  step: HandsonStep;
  language: "en" | "ja";
  readOnly: boolean;
  onCommandReport?: (commandIndex: number, status: "ok" | "error") => Promise<void>;
}) {
  const parts = splitByCodeBlocks(step.contentMarkdown, step.codeBlocks);

  return (
    <div id={`step-${step.id}`}>
      {parts.map((part, i) => {
        if (part.type === "codeblock") {
          return (
            <div key={i}>
              <div className="prose prose-zinc max-w-none dark:prose-invert handson-prose overflow-visible">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.content}
                </ReactMarkdown>
              </div>
              {!readOnly && onCommandReport && part.globalIndex !== undefined && (
                <CommandStatusButtons
                  language={language}
                  globalNumber={part.globalIndex + 1}
                  onReport={async (status) => {
                    await onCommandReport(part.globalIndex!, status);
                  }}
                />
              )}
            </div>
          );
        }
        return (
          <div key={i} className="prose prose-zinc max-w-none dark:prose-invert handson-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {part.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
