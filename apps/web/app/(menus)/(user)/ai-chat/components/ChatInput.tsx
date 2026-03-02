"use client";

import { RefObject, useState } from "react";
import { BookOpen, Database, PanelRight } from "lucide-react";
import {
  RiRefreshLine,
  RiSendPlane2Line,
  RiStopCircleLine,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import type { TutorialDocument } from "@/types/ai-chat";
import { aiChatTranslations } from "../translations";
import { TutorialSelector } from "./TutorialSelector";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onRegenerate: () => void;
  isLoading: boolean;
  hasMessages: boolean;
  useOrgContext: boolean;
  onSetUseOrgContext: (value: boolean) => void;
  mentionPopupOpen: boolean;
  onMentionPopupChange: (open: boolean) => void;
  orgContextAvailable: boolean;
  language: "en" | "ja";
  textareaRef: RefObject<HTMLTextAreaElement>;
  selectedTutorialDoc: TutorialDocument | null;
  onSelectTutorialDoc: (doc: TutorialDocument | null) => void;
  tutorialDocuments: TutorialDocument[];
  tutorialSelectorOpen: boolean;
  onTutorialSelectorOpenChange: (open: boolean) => void;
  tutorialDocsAvailable: boolean;
  docPanelOpen?: boolean;
  onToggleDocPanel?: () => void;
  useRagContext?: boolean;
  onSetUseRagContext?: (value: boolean) => void;
  ragDocumentCount?: number;
}

function OrgIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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

function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onStop,
  onRegenerate,
  isLoading,
  hasMessages,
  useOrgContext,
  onSetUseOrgContext,
  mentionPopupOpen,
  onMentionPopupChange,
  orgContextAvailable,
  language,
  textareaRef,
  selectedTutorialDoc,
  onSelectTutorialDoc,
  tutorialDocuments,
  tutorialSelectorOpen,
  onTutorialSelectorOpenChange,
  tutorialDocsAvailable,
  docPanelOpen,
  onToggleDocPanel,
  useRagContext,
  onSetUseRagContext,
  ragDocumentCount,
}: ChatInputProps) {
  const t = aiChatTranslations[language];
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // @メンションポップアップが開いている場合
    if (mentionPopupOpen) {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        onSetUseOrgContext(true);
        onMentionPopupChange(false);
        // @文字を削除
        onInputChange(input.replace(/@$/, ""));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onMentionPopupChange(false);
        return;
      }
    }

    // IME変換中はEnterキーでメッセージを送信しない
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onInputChange(value);

    // @メンションポップアップの制御
    if (orgContextAvailable) {
      if (
        value.endsWith("@") &&
        (value.length === 1 || value.slice(-2, -1) === " ")
      ) {
        onMentionPopupChange(true);
      } else if (mentionPopupOpen && !value.endsWith("@")) {
        onMentionPopupChange(false);
      }
    }
  };

  const handleSelectMention = () => {
    onSetUseOrgContext(true);
    onMentionPopupChange(false);
    // @文字を削除
    onInputChange(input.replace(/@$/, ""));
    textareaRef.current?.focus();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="flex-shrink-0 border-t px-4 py-4">
      {/* Context chips */}
      {(useOrgContext || selectedTutorialDoc || useRagContext) && (
        <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
          {useRagContext && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
              <Database className="w-3 h-3" />
              @{t.ragMention}
              <span className="text-amber-500 dark:text-amber-400">
                {ragDocumentCount}{t.ragDocCount}
              </span>
              <button
                type="button"
                onClick={() => onSetUseRagContext?.(false)}
                className="ml-0.5 hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
              >
                &times;
              </button>
            </span>
          )}
          {useOrgContext && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
              <OrgIcon className="w-3 h-3" />
              @{t.orgMention}
              <button
                type="button"
                onClick={() => onSetUseOrgContext(false)}
                className="ml-0.5 hover:text-green-900 dark:hover:text-green-100 cursor-pointer"
              >
                &times;
              </button>
            </span>
          )}
          {selectedTutorialDoc && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              <BookOpen className="w-3 h-3" />
              {language === "ja" && selectedTutorialDoc.titleJa
                ? selectedTutorialDoc.titleJa
                : selectedTutorialDoc.title}
              <span className="text-purple-500 dark:text-purple-400">
                ~{formatTokenCount(selectedTutorialDoc.estimatedTokens)}
              </span>
              {!docPanelOpen && onToggleDocPanel && (
                <button
                  type="button"
                  onClick={onToggleDocPanel}
                  className="ml-0.5 hover:text-purple-900 dark:hover:text-purple-100 cursor-pointer"
                  title={t.tutorialPanel.openPanel}
                >
                  <PanelRight className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectTutorialDoc(null)}
                className="ml-0.5 hover:text-purple-900 dark:hover:text-purple-100 cursor-pointer"
              >
                &times;
              </button>
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="flex gap-2 items-center">
        {/* Regenerate button - left side */}
        {hasMessages && !isLoading && (
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={onRegenerate}
            className="h-12 w-12 rounded-xl flex-shrink-0"
            title={t.regenerate}
          >
            <RiRefreshLine className="w-5 h-5" />
          </Button>
        )}

        {/* Stop button - left side (when loading) */}
        {isLoading && (
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={onStop}
            className="h-12 w-12 rounded-xl flex-shrink-0"
            title={t.stopGenerating}
          >
            <RiStopCircleLine className="w-5 h-5" />
          </Button>
        )}

        {/* Tutorial button */}
        {tutorialDocsAvailable && (
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => onTutorialSelectorOpenChange(!tutorialSelectorOpen)}
              className={`h-12 w-12 rounded-xl flex-shrink-0 ${
                selectedTutorialDoc
                  ? "border-purple-400 dark:border-purple-600 text-purple-600 dark:text-purple-400"
                  : ""
              }`}
              title={t.tutorialButton}
            >
              <BookOpen className="w-5 h-5" />
            </Button>
            <TutorialSelector
              open={tutorialSelectorOpen}
              onOpenChange={onTutorialSelectorOpenChange}
              documents={tutorialDocuments}
              onSelect={onSelectTutorialDoc}
              language={language}
            />
          </div>
        )}

        <div className="flex-1 relative">
          {/* @Mention popup */}
          {mentionPopupOpen && (
            <div className="absolute bottom-full mb-1 left-0 bg-popover border border-border rounded-lg shadow-lg py-1 z-10 min-w-[180px]">
              <button
                type="button"
                onClick={handleSelectMention}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer"
              >
                <OrgIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>@{t.orgMention}</span>
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={
              orgContextAvailable
                ? `${t.placeholder} (${t.orgMentionHint})`
                : t.placeholder
            }
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-[14px] pr-12 text-sm leading-5 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-h-[200px]"
            rows={1}
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className="h-12 w-12 rounded-xl flex-shrink-0"
        >
          <RiSendPlane2Line className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
