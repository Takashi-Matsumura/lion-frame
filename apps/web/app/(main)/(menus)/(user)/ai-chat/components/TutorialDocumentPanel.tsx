"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Check, Copy, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TutorialDocument, TutorialDocumentDetail } from "@/types/ai-chat";
import { aiChatTranslations } from "../translations";

interface TutorialDocumentPanelProps {
  document: TutorialDocument;
  onClose: () => void;
  language: "en" | "ja";
}

export function TutorialDocumentPanel({
  document,
  onClose,
  language,
}: TutorialDocumentPanelProps) {
  const t = aiChatTranslations[language];
  const tp = t.tutorialPanel;
  const [detail, setDetail] = useState<TutorialDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const title =
    language === "ja" && document.titleJa ? document.titleJa : document.title;

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/tutorial-documents/${document.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data.document);
      }
    } catch {
      // silently fail — panel will show loading state
    } finally {
      setLoading(false);
    }
  }, [document.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCopy = async () => {
    if (!detail?.extractedText) return;
    await navigator.clipboard.writeText(detail.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <span className="font-medium text-sm truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            title={copied ? tp.copiedText : tp.copyText}
            disabled={!detail?.extractedText}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title={tp.close}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
            {tp.loading}
          </div>
        </div>
      ) : (
        <Tabs defaultValue="pdf" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 flex-shrink-0">
            <TabsTrigger value="pdf" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {tp.pdfTab}
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {tp.textTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="flex-1 min-h-0 m-0 p-2">
            {detail?.fileUrl ? (
              <iframe
                src={detail.fileUrl}
                className="w-full h-full rounded border"
                title={title}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                {tp.pdfLoadError}
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="flex-1 min-h-0 m-0 flex flex-col">
            <div className="px-4 py-2 flex-shrink-0">
              <p className="text-xs text-muted-foreground">{tp.textDescription}</p>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <pre className="whitespace-pre-wrap font-mono text-sm px-4 pb-4 leading-relaxed">
                {detail?.extractedText || ""}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-2 border-t flex-shrink-0 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-xs">
          {document.pageCount} {t.tutorialPages}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          ~{document.estimatedTokens.toLocaleString()} {t.tutorialTokens}
        </Badge>
      </div>
    </div>
  );
}
