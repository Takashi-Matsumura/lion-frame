'use client';

import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import type { Message, SearchResult, RAGContext } from '../../types';
import { LinkIcon, DatabaseIcon } from './Icons';

interface ChatOutputProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
}

export function ChatOutput({ messages, isLoading, streamingContent }: ChatOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <div className="mb-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-foreground mb-2">
          AI Playground
        </h2>
        <p className="text-sm text-center max-w-md">
          左側でモードを選んで、質問を入力してください。
          <br />
          わかりやすく回答します。
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 space-y-1 p-4">
        {messages.map((message, index) => (
          <div key={index} className="flex items-start gap-3 py-2">
            <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {message.role === 'user' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-sm text-foreground">
                  {message.role === 'user' ? 'あなた' : 'AI'}
                </span>
              </div>
              {message.role === 'user' ? (
                <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="text-foreground">
                  <MarkdownContent content={message.content} />
                  {message.sources && message.sources.length > 0 && (
                    <SourceLinks sources={message.sources} />
                  )}
                  {message.ragSources && message.ragSources.length > 0 && (
                    <RAGSourceLinks sources={message.ragSources} />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && streamingContent && (
          <div className="flex items-start gap-3 py-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-sm text-foreground">AI</span>
              </div>
              <div className="text-foreground">
                <MarkdownContent content={streamingContent} />
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
              </div>
            </div>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="flex items-start gap-3 py-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-sm text-foreground">AI</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>考え中...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  const parts: Array<{ type: 'think' | 'content'; text: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = thinkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = content.slice(lastIndex, match.index);
      if (beforeText.trim()) parts.push({ type: 'content', text: beforeText });
    }
    parts.push({ type: 'think', text: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) parts.push({ type: 'content', text: remaining });
  }

  if (parts.length === 0) return <MarkdownLines content={content} />;

  const mergedParts: Array<{ type: 'think' | 'content'; text: string }> = [];
  for (const part of parts) {
    const last = mergedParts[mergedParts.length - 1];
    if (last && last.type === 'think' && part.type === 'think') {
      last.text += part.text;
    } else {
      mergedParts.push({ ...part });
    }
  }

  return (
    <div className="space-y-2">
      {mergedParts.map((part, i) =>
        part.type === 'think'
          ? <ThinkingBlock key={i} content={part.text} />
          : <MarkdownLines key={i} content={part.text} />,
      )}
    </div>
  );
}

function ThinkingBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden my-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-sm font-medium flex items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>推論過程</span>
        <span className="text-xs text-purple-500 dark:text-purple-400">
          {isOpen ? 'クリックで閉じる' : 'クリックで展開'}
        </span>
      </button>
      {isOpen && (
        <div className="px-3 py-2 bg-purple-50/50 dark:bg-purple-950/20 text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
          {content}
        </div>
      )}
    </div>
  );
}

function renderBlockMath(latex: string): string {
  try { return katex.renderToString(latex, { displayMode: true, throwOnError: false }); }
  catch { return latex; }
}

type Block =
  | { type: 'line'; value: string }
  | { type: 'table'; rows: string[][] }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'codeblock'; lang: string; code: string }
  | { type: 'hr' };

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) { codeLines.push(lines[i]); i++; }
      blocks.push({ type: 'codeblock', lang, code: codeLines.join('\n') });
      i++; continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) { blocks.push({ type: 'hr' }); i++; continue; }
    if (/^\|.+\|/.test(line.trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|.+\|/.test(lines[i].trim())) { tableLines.push(lines[i]); i++; }
      const rows: string[][] = [];
      for (const tl of tableLines) {
        const cells = tl.split('|').slice(1, -1).map(c => c.trim());
        if (cells.every(c => /^[-:]+$/.test(c))) continue;
        rows.push(cells);
      }
      if (rows.length > 0) blocks.push({ type: 'table', rows });
      continue;
    }
    if (line.startsWith('> ') || line === '>') {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) { quoteLines.push(lines[i].startsWith('> ') ? lines[i].slice(2) : ''); i++; }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }
    blocks.push({ type: 'line', value: line });
    i++;
  }
  return blocks;
}

function renderLine(line: string, key: string): React.ReactNode {
  if (line.startsWith('## ')) return <h2 key={key} className="text-lg font-bold mt-4 mb-2 text-primary">{line.slice(3)}</h2>;
  if (line.startsWith('### ')) return <h3 key={key} className="text-base font-semibold mt-3 mb-1">{line.slice(4)}</h3>;
  if (line.startsWith('**') && line.endsWith('**')) return <h3 key={key} className="text-base font-semibold mt-3 mb-1 text-primary">{line.slice(2, -2)}</h3>;
  if (line.startsWith('- ') || line.startsWith('• ')) return <div key={key} className="flex gap-2 ml-2"><span className="text-primary">•</span><span>{formatInlineText(line.slice(2))}</span></div>;
  if (/^\d+\. /.test(line)) {
    const numMatch = line.match(/^(\d+)\. (.*)$/);
    if (numMatch) return <div key={key} className="flex gap-2 ml-2"><span className="text-primary font-medium">{numMatch[1]}.</span><span>{formatInlineText(numMatch[2])}</span></div>;
  }
  if (line.trim() === '') return <div key={key} className="h-2" />;
  return <p key={key} className="leading-relaxed">{formatInlineText(line)}</p>;
}

function MarkdownLines({ content }: { content: string }) {
  const blockMathRegex = /\\\[([\s\S]*?)\\\]/g;
  const segments: Array<{ type: 'text' | 'block-math'; value: string }> = [];
  let lastIdx = 0;
  let m;
  while ((m = blockMathRegex.exec(content)) !== null) {
    if (m.index > lastIdx) segments.push({ type: 'text', value: content.slice(lastIdx, m.index) });
    segments.push({ type: 'block-math', value: m[1] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < content.length) segments.push({ type: 'text', value: content.slice(lastIdx) });

  return (
    <div className="space-y-2">
      {segments.map((seg, si) => {
        if (seg.type === 'block-math') return <div key={`math-${si}`} className="my-2 overflow-x-auto" dangerouslySetInnerHTML={{ __html: renderBlockMath(seg.value) }} />;
        const blocks = parseBlocks(seg.value);
        return blocks.map((block, bi) => {
          const key = `${si}-${bi}`;
          switch (block.type) {
            case 'hr': return <hr key={key} className="my-4 border-border" />;
            case 'codeblock': return <pre key={key} className="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-sm"><code>{block.code}</code></pre>;
            case 'blockquote': return (
              <blockquote key={key} className="border-l-4 border-primary/50 pl-3 my-2 text-muted-foreground italic">
                {block.lines.map((ql, qi) => <p key={qi} className="leading-relaxed">{formatInlineText(ql)}</p>)}
              </blockquote>
            );
            case 'table': return (
              <div key={key} className="my-2 overflow-x-auto">
                <table className="border-collapse border border-border text-sm w-auto">
                  <thead><tr className="bg-muted">{block.rows[0]?.map((cell, ci) => <th key={ci} className="border border-border px-3 py-1.5 font-semibold text-left">{formatInlineText(cell)}</th>)}</tr></thead>
                  <tbody>{block.rows.slice(1).map((row, ri) => <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/50'}>{row.map((cell, ci) => <td key={ci} className="border border-border px-3 py-1.5">{formatInlineText(cell)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
            case 'line': return renderLine(block.value, key);
          }
        });
      })}
    </div>
  );
}

function renderInlineMath(latex: string): string {
  try { return katex.renderToString(latex, { displayMode: false, throwOnError: false }); }
  catch { return latex; }
}

function formatInlineText(text: string): React.ReactNode {
  const parts = text.split(/(\\\([\s\S]*?\\\)|\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('\\(') && part.endsWith('\\)')) return <span key={i} dangerouslySetInnerHTML={{ __html: renderInlineMath(part.slice(2, -2)) }} />;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-muted px-1 py-0.5 rounded text-sm">{part.slice(1, -1)}</code>;
    return part;
  });
}

function SourceLinks({ sources }: { sources: SearchResult[] }) {
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
        <LinkIcon className="w-4 h-4" /> 参考リンク
      </h4>
      <ul className="space-y-1">
        {sources.map((source, i) => (
          <li key={i} className="text-sm">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{source.title || source.url}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RAGSourceLinks({ sources }: { sources: RAGContext[] }) {
  const uniqueFiles = Array.from(new Map(sources.map((s) => [s.metadata.filename, s])).values());
  return (
    <div className="mt-4 pt-4 border-t border-border">
      <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
        <DatabaseIcon className="w-4 h-4" /> 参照ドキュメント
      </h4>
      <ul className="space-y-1">
        {uniqueFiles.map((source, i) => (
          <li key={i} className="text-sm flex items-center gap-2">
            <span className="text-muted-foreground">{source.metadata.filename}</span>
            <span className="text-xs text-muted-foreground">(関連度: {Math.round(source.score * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
