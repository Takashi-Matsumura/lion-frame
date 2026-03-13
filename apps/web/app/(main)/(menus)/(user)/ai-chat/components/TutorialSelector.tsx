"use client";

import { BookOpen, FileText } from "lucide-react";
import { useEffect, useRef } from "react";
import type { TutorialDocument } from "@/types/ai-chat";
import { aiChatTranslations } from "../translations";

interface TutorialSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: TutorialDocument[];
  onSelect: (doc: TutorialDocument) => void;
  language: "en" | "ja";
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
}

export function TutorialSelector({
  open,
  onOpenChange,
  documents,
  onSelect,
  language,
}: TutorialSelectorProps) {
  const t = aiChatTranslations[language];
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full mb-1 left-0 bg-popover border border-border rounded-lg shadow-lg py-1 z-10 min-w-[280px] max-w-[360px] max-h-[300px] overflow-y-auto"
    >
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
        <BookOpen className="w-3 h-3 inline mr-1" />
        {t.tutorialSelect}
      </div>
      {documents.length === 0 ? (
        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
          {t.tutorialNone}
        </div>
      ) : (
        documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => {
              onSelect(doc);
              onOpenChange(false);
            }}
            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {language === "ja" && doc.titleJa ? doc.titleJa : doc.title}
              </div>
              {(doc.description || doc.descriptionJa) && (
                <div className="text-xs text-muted-foreground truncate">
                  {language === "ja" && doc.descriptionJa
                    ? doc.descriptionJa
                    : doc.description}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {doc.pageCount} {t.tutorialPages} · ~{formatTokenCount(doc.estimatedTokens)} {t.tutorialTokens}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
