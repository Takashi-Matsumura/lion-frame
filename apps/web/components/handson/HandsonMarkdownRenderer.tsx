"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CommandStatusButtons from "./CommandStatusButtons";
import SectionCheckpoint from "./SectionCheckpoint";
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
  onCheckpoint?: (sectionIndex: number) => Promise<void>;
}

export default function HandsonMarkdownRenderer({
  language,
  parsed,
  readOnly = false,
  onCommandReport,
  onCheckpoint,
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
            onCheckpoint={onCheckpoint}
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
  onCheckpoint,
}: {
  section: HandsonSection;
  language: "en" | "ja";
  readOnly: boolean;
  onCommandReport?: (commandIndex: number, status: "ok" | "error") => Promise<void>;
  onCheckpoint?: (sectionIndex: number) => Promise<void>;
}) {
  return (
    <div data-section-index={section.index}>
      {/* イントロ部分 */}
      {section.introMarkdown && (
        <IntroContent
          markdown={section.introMarkdown}
          codeBlocks={section.introCodeBlocks}
          language={language}
          readOnly={readOnly}
          onCommandReport={onCommandReport}
        />
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

      {/* セクションチェックポイント */}
      {!readOnly && onCheckpoint && section.steps.length > 0 && (
        <SectionCheckpoint
          language={language}
          onComplete={async () => {
            await onCheckpoint(section.index);
          }}
        />
      )}
    </div>
  );
}

// === イントロコンテンツ ===
function IntroContent({
  markdown,
  codeBlocks,
  language,
  readOnly,
  onCommandReport,
}: {
  markdown: string;
  codeBlocks: { globalIndex: number }[];
  language: "en" | "ja";
  readOnly: boolean;
  onCommandReport?: (commandIndex: number, status: "ok" | "error") => Promise<void>;
}) {
  const codeBlockMap = new Map(codeBlocks.map((cb) => [cb.globalIndex, cb]));

  return (
    <MarkdownWithCodeButtons
      markdown={markdown}
      codeBlocks={codeBlockMap}
      language={language}
      readOnly={readOnly}
      onCommandReport={onCommandReport}
    />
  );
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
  const codeBlockMap = new Map(step.codeBlocks.map((cb) => [cb.globalIndex, cb]));

  return (
    <div id={`step-${step.id}`}>
      <MarkdownWithCodeButtons
        markdown={step.contentMarkdown}
        codeBlocks={codeBlockMap}
        language={language}
        readOnly={readOnly}
        onCommandReport={onCommandReport}
      />
    </div>
  );
}

// === Markdownレンダリング + コードブロックボタン ===
function MarkdownWithCodeButtons({
  markdown,
  codeBlocks,
  language,
  readOnly,
  onCommandReport,
}: {
  markdown: string;
  codeBlocks: Map<number, { globalIndex: number }>;
  language: "en" | "ja";
  readOnly: boolean;
  onCommandReport?: (commandIndex: number, status: "ok" | "error") => Promise<void>;
}) {
  // コードブロックの出現順でグローバルインデックスを割り当て
  const globalIndices = Array.from(codeBlocks.keys()).sort((a, b) => a - b);
  let codeBlockCounter = 0;

  return (
    <div className="prose prose-zinc max-w-none dark:prose-invert handson-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // コードブロックにコピーボタンとOK/Errorボタンを付与
          pre({ children, ...props }) {
            const currentIndex = codeBlockCounter;
            codeBlockCounter++;
            const globalIndex = globalIndices[currentIndex];

            return (
              <div>
                <CodeBlockWrapper language={language}>
                  <pre {...props}>{children}</pre>
                </CodeBlockWrapper>
                {!readOnly && onCommandReport && globalIndex !== undefined && (
                  <CommandStatusButtons
                    language={language}
                    globalNumber={globalIndex + 1}
                    onReport={async (status) => {
                      await onCommandReport(globalIndex, status);
                    }}
                  />
                )}
              </div>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

// === コードブロックラッパー（コピーボタン付き） ===
function CodeBlockWrapper({
  language,
  children,
}: {
  language: "en" | "ja";
  children: React.ReactNode;
}) {
  const t = translations[language];
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    // pre > code のテキストを取得
    const el = document.querySelector(".handson-copy-target");
    if (!el) return;
    const text = el.textContent || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <div className="group/code relative">
      <div className="handson-copy-target">{children}</div>
      <button
        onClick={(e) => {
          // pre内のcodeのテキストを取得
          const pre = (e.currentTarget as HTMLElement).previousElementSibling?.querySelector("pre");
          const code = pre?.querySelector("code") || pre;
          if (code) {
            navigator.clipboard.writeText(code.textContent || "").then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }
        }}
        className="absolute top-2 right-2 rounded-md bg-muted/80 px-2 py-1 text-xs text-muted-foreground opacity-0 transition hover:bg-muted group-hover/code:opacity-100"
      >
        {copied ? t.copied : t.copy}
      </button>
    </div>
  );
}
