"use client";

import { RefObject } from "react";
import dynamic from "next/dynamic";
import { Database } from "lucide-react";
import {
  RiCheckLine,
  RiFileCopyLine,
  RiSparklingLine,
  RiUser3Line,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";

// bundle-dynamic-imports: 重いmarkdownパーサーを遅延読み込み
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
import type { ChatMessage, TutorialDocument } from "@/types/ai-chat";
import { aiChatTranslations } from "../translations";
import { RagInsightPanel } from "./RagInsightPanel";

interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingContent: string;
  isLoading: boolean;
  language: "en" | "ja";
  userName: string;
  onCopy: (id: string, content: string) => void;
  copiedId: string | null;
  onSuggestionClick: (text: string, useOrg: boolean) => void;
  onTutorialSuggestionClick?: (text: string, doc: TutorialDocument) => void;
  messagesEndRef: RefObject<HTMLDivElement>;
  orgContextAvailable: boolean;
  tutorialDocuments?: TutorialDocument[];
  selectedTutorialDoc?: TutorialDocument | null;
  error: string | null;
}

const markdownComponents = {
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {children}
    </a>
  ),
  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => {
    const isInline = !className;
    return isInline ? (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ) : (
      <code className={className}>{children}</code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-muted p-3 rounded-lg overflow-x-auto">{children}</pre>
  ),
};

function OrgBadgeIcon() {
  return (
    <svg
      className="w-2.5 h-2.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

export function ChatMessageList({
  messages,
  streamingContent,
  isLoading,
  language,
  userName,
  onCopy,
  copiedId,
  onSuggestionClick,
  onTutorialSuggestionClick,
  messagesEndRef,
  orgContextAvailable,
  tutorialDocuments,
  selectedTutorialDoc,
  error,
}: ChatMessageListProps) {
  const t = aiChatTranslations[language];

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
        <div className="h-full flex flex-col items-center justify-center">
          <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <RiSparklingLine className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">{t.welcomeTitle}</h2>
          <p className="text-muted-foreground mb-8">{t.welcomeHint}</p>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 justify-center max-w-lg">
            {selectedTutorialDoc && onTutorialSuggestionClick ? (
              // ドキュメント選択中: そのドキュメントのプロンプトのみ表示
              (selectedTutorialDoc.suggestedPrompts || []).map((prompt, index) => {
                const text =
                  language === "ja" && prompt.textJa
                    ? prompt.textJa
                    : prompt.text;
                if (!text) return null;
                return (
                  <button
                    key={`selected-tutorial-${index}`}
                    onClick={() => onTutorialSuggestionClick(text, selectedTutorialDoc)}
                    className="px-4 py-2 text-sm border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                  >
                    {text}
                  </button>
                );
              })
            ) : (
              // ドキュメント未選択: 通常のサジェスション
              <>
                {t.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestionClick(suggestion, false)}
                    className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
                {orgContextAvailable &&
                  t.orgSuggestions.map((suggestion, index) => (
                    <button
                      key={`org-${index}`}
                      onClick={() => onSuggestionClick(suggestion, true)}
                      className="px-4 py-2 text-sm border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-full hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
      <div className="space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="group">
            <div className="flex gap-4">
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-gradient-to-br from-primary/20 to-primary/10"
                }`}
              >
                {message.role === "user" ? (
                  <RiUser3Line className="w-4 h-4" />
                ) : (
                  <RiSparklingLine className="w-4 h-4 text-primary" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {message.role === "user" ? userName : t.ai}
                  </span>
                  {message.orgContext && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                      <OrgBadgeIcon />
                      {t.orgBadge}
                    </span>
                  )}
                  {message.tutorialDocTitle && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      {t.tutorialBadge}
                    </span>
                  )}
                  {(message.ragContext || message.ragRetrievalData) && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                      <Database className="w-2.5 h-2.5" />
                      {t.ragBadge}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString(
                      language === "ja" ? "ja-JP" : "en-US",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {message.role === "assistant" ? (
                    <ReactMarkdown components={markdownComponents}>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>

                {/* RAG Insight Panel */}
                {message.role === "assistant" && message.ragRetrievalData && (
                  <RagInsightPanel data={message.ragRetrievalData} t={t} />
                )}

                {/* Actions */}
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onCopy(message.id, message.content)}
                    >
                      {copiedId === message.id ? (
                        <>
                          <RiCheckLine className="w-3 h-3 mr-1" />
                          {t.copied}
                        </>
                      ) : (
                        <>
                          <RiFileCopyLine className="w-3 h-3 mr-1" />
                          {t.copy}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming / Loading indicator */}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
              <RiSparklingLine className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{t.ai}</span>
              </div>
              {streamingContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown components={markdownComponents}>
                    {streamingContent}
                  </ReactMarkdown>
                  <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                  </div>
                  <span className="text-sm">{t.thinking}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive font-medium">
              {t.errorTitle}
            </p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
