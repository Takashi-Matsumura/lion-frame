"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Database } from "lucide-react";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";
import {
  RiBarChartBoxLine,
  RiDeleteBinLine,
  RiRobot2Line,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  estimateMessagesTokens,
  estimateTokens,
  getContextWindowSize,
} from "@/lib/core-modules/ai";
import type { ChatMessage, RagRetrievalData, TokenStats, TutorialDocument } from "@/types/ai-chat";
import { ChatInput } from "./components/ChatInput";
import { ChatMessageList } from "./components/ChatMessageList";
import { TokenStatsPanel } from "./components/TokenStatsPanel";
import { TutorialDocumentPanel } from "./components/TutorialDocumentPanel";
import { RagDocumentManager } from "./components/RagDocumentManager";
import { AIChatSkeleton } from "./AIChatSkeleton";
import { aiChatTranslations } from "./translations";

interface AIChatClientProps {
  language: "en" | "ja";
  userName: string;
}

export function AIChatClient({ language, userName }: AIChatClientProps) {
  const t = aiChatTranslations[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [providerInfo, setProviderInfo] = useState<{
    providerName: string;
    modelName: string;
  } | null>(null);
  const [orgContextAvailable, setOrgContextAvailable] = useState(false);
  const [mentionPopupOpen, setMentionPopupOpen] = useState(false);
  const [useOrgContext, setUseOrgContext] = useState(false);
  const [tutorialDocsAvailable, setTutorialDocsAvailable] = useState(false);
  const [tutorialDocuments, setTutorialDocuments] = useState<TutorialDocument[]>([]);
  const [selectedTutorialDoc, setSelectedTutorialDoc] = useState<TutorialDocument | null>(null);
  const [tutorialSelectorOpen, setTutorialSelectorOpen] = useState(false);
  const [docPanelOpen, setDocPanelOpen] = useState(false);
  const [ragAvailable, setRagAvailable] = useState(false);
  const [ragDocumentCount, setRagDocumentCount] = useState(0);
  const [useRagContext, setUseRagContext] = useState(false);
  const floatingWindow = useFloatingWindowStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showStats, setShowStats] = useState(true);
  const [tokenStats, setTokenStats] = useState<TokenStats>({
    inputTokens: 0,
    outputTokens: 0,
    contextWindow: 4096,
    tokensPerSecond: 0,
    generationStartTime: null,
    lastOutputTokens: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if AI is enabled and get provider info
  // 両方のfetchを並列実行（async-parallel: ウォーターフォール排除）
  useEffect(() => {
    Promise.all([
      fetch("/api/ai/chat").then((res) => res.json()),
      fetch("/api/ai/tutorial-documents").then((res) => res.json()).catch(() => null),
    ])
      .then(([chatData, tutorialData]) => {
        setAiEnabled(chatData.available);
        if (chatData.providerName && chatData.modelName) {
          setProviderInfo({
            providerName: chatData.providerName,
            modelName: chatData.modelName,
          });
          const contextWindow = getContextWindowSize(
            chatData.providerName,
            chatData.modelName,
          );
          setTokenStats((prev) => ({ ...prev, contextWindow }));
        }
        if (chatData.orgContextAvailable) {
          setOrgContextAvailable(true);
        }
        if (chatData.tutorialDocsAvailable) {
          setTutorialDocsAvailable(true);
          if (tutorialData?.documents) {
            setTutorialDocuments(tutorialData.documents);
          }
        }
        if (chatData.ragAvailable) {
          setRagAvailable(true);
          setRagDocumentCount(chatData.ragDocumentCount || 0);
        }
      })
      .catch(() => {
        setAiEnabled(false);
      });
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  // ストリーミングリクエストを実行する共通関数
  const executeStreamingRequest = async (
    conversationHistory: { role: string; content: string }[],
    orgContext: boolean,
    tutorialDocId?: string,
    ragContext?: boolean,
  ) => {
    const inputTokens = estimateMessagesTokens(conversationHistory);
    const startTime = Date.now();

    setTokenStats((prev) => ({
      ...prev,
      inputTokens,
      outputTokens: 0,
      tokensPerSecond: 0,
      generationStartTime: startTime,
      lastOutputTokens: 0,
    }));

    statsIntervalRef.current = setInterval(() => {
      setTokenStats((prev) => {
        if (!prev.generationStartTime) return prev;
        const elapsed = (Date.now() - prev.generationStartTime) / 1000;
        if (elapsed > 0 && prev.outputTokens > 0) {
          return {
            ...prev,
            tokensPerSecond: Math.round(prev.outputTokens / elapsed),
          };
        }
        return prev;
      });
    }, 200);

    const response = await fetch("/api/ai/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversationHistory,
        useOrgContext: orgContext,
        ...(tutorialDocId && { tutorialDocId }),
        ...(ragContext && { useRagContext: true }),
      }),
      signal: abortControllerRef.current!.signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let messageAdded = false;
    let ragMetadataForMessage: RagRetrievalData | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);

        try {
          const parsed = JSON.parse(data);
          if (parsed.ragMetadata) {
            ragMetadataForMessage = parsed.ragMetadata;
          }
          if (parsed.content) {
            fullContent += parsed.content;
            setStreamingContent(fullContent);
            const outputTokens = estimateTokens(fullContent);
            setTokenStats((prev) => ({ ...prev, outputTokens }));
          }
          if (parsed.done && !messageAdded) {
            messageAdded = true;
            const outputTokens = estimateTokens(fullContent);
            const assistantMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: fullContent,
              timestamp: new Date(),
              tokenCount: outputTokens,
              ragRetrievalData: ragMetadataForMessage,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingContent("");

            const elapsed = (Date.now() - startTime) / 1000;
            setTokenStats((prev) => ({
              ...prev,
              outputTokens,
              tokensPerSecond:
                elapsed > 0 ? Math.round(outputTokens / elapsed) : 0,
              generationStartTime: null,
            }));
          }
          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch (parseError) {
          if (
            parseError instanceof Error &&
            parseError.message !== "Unexpected end of JSON input"
          ) {
            if (data !== "[DONE]") {
              console.error("Parse error:", parseError);
            }
          }
        }
      }
    }

    // バッファに残ったデータを処理
    if (fullContent && !messageAdded) {
      const outputTokens = estimateTokens(fullContent);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent,
        timestamp: new Date(),
        tokenCount: outputTokens,
        ragRetrievalData: ragMetadataForMessage,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  const handleSubmit = async (
    e?: React.FormEvent,
    suggestionText?: string,
    forceOrgContext?: boolean,
    forceTutorialDoc?: TutorialDocument | null,
    forceRagContext?: boolean,
  ) => {
    e?.preventDefault();
    const text = suggestionText || input.trim();
    if (!text || isLoading) return;

    const orgContextForThisMessage = forceOrgContext ?? useOrgContext;
    const tutorialDocForThisMessage = forceTutorialDoc !== undefined ? forceTutorialDoc : selectedTutorialDoc;
    const ragContextForThisMessage = forceRagContext ?? useRagContext;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
      tokenCount: estimateTokens(text),
      orgContext: orgContextForThisMessage,
      tutorialDocId: tutorialDocForThisMessage?.id,
      tutorialDocTitle: tutorialDocForThisMessage
        ? (language === "ja" && tutorialDocForThisMessage.titleJa
            ? tutorialDocForThisMessage.titleJa
            : tutorialDocForThisMessage.title)
        : undefined,
      ragContext: ragContextForThisMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setUseOrgContext(false);
    setMentionPopupOpen(false);
    setIsLoading(true);
    setError(null);
    setStreamingContent("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      abortControllerRef.current = new AbortController();
      const conversationHistory = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      await executeStreamingRequest(
        conversationHistory,
        orgContextForThisMessage,
        tutorialDocForThisMessage?.id,
        ragContextForThisMessage,
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        if (streamingContent) {
          const outputTokens = estimateTokens(streamingContent);
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: streamingContent,
            timestamp: new Date(),
            tokenCount: outputTokens,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
        setStreamingContent("");
        return;
      }
      setError(err instanceof Error ? err.message : t.errorMessage);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      abortControllerRef.current = null;
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      setTokenStats((prev) => ({ ...prev, generationStartTime: null }));
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
    setUseRagContext(false);
    setTokenStats((prev) => ({
      ...prev,
      inputTokens: 0,
      outputTokens: 0,
      tokensPerSecond: 0,
      generationStartTime: null,
    }));
    setShowClearConfirm(false);
  };

  const handleCopy = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  const handleRegenerate = async () => {
    if (messages.length < 2) return;

    const newMessages = messages.slice(0, -1);
    setMessages(newMessages);

    const lastUserMessage = newMessages[newMessages.length - 1];
    if (lastUserMessage?.role === "user") {
      const regenerateOrgContext = lastUserMessage.orgContext ?? false;
      const regenerateTutorialDocId = lastUserMessage.tutorialDocId;
      const regenerateRagContext = lastUserMessage.ragContext ?? false;
      setIsLoading(true);
      setError(null);
      setStreamingContent("");

      try {
        abortControllerRef.current = new AbortController();
        const conversationHistory = newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        await executeStreamingRequest(
          conversationHistory,
          regenerateOrgContext,
          regenerateTutorialDocId,
          regenerateRagContext,
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          if (streamingContent) {
            const outputTokens = estimateTokens(streamingContent);
            const assistantMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: streamingContent,
              timestamp: new Date(),
              tokenCount: outputTokens,
            };
            setMessages((prev) => [...prev, assistantMessage]);
          }
          setStreamingContent("");
          return;
        }
        setError(err instanceof Error ? err.message : t.errorMessage);
      } finally {
        setIsLoading(false);
        setStreamingContent("");
        abortControllerRef.current = null;
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = null;
        }
        setTokenStats((prev) => ({ ...prev, generationStartTime: null }));
      }
    }
  };

  const handleSelectTutorialDoc = useCallback((doc: TutorialDocument | null) => {
    setSelectedTutorialDoc(doc);
    if (doc) {
      setDocPanelOpen(true);
    }
  }, []);

  const handleOpenRagManager = useCallback(() => {
    floatingWindow.open({
      title: "RAG Documents",
      titleJa: t.ragDialog.title,
      content: (
        <RagDocumentManager
          language={language}
          onDocumentCountChange={setRagDocumentCount}
        />
      ),
      initialSize: { width: 700, height: 520 },
      initialPosition: { x: 200, y: 120 },
      modal: true,
      invertTheme: true,
    });
  }, [floatingWindow, language, t.ragDialog.title]);

  const handleSuggestionClick = (text: string, useOrg: boolean) => {
    handleSubmit(undefined, text, useOrg);
  };

  const handleTutorialSuggestionClick = (text: string, doc: TutorialDocument) => {
    handleSubmit(undefined, text, false, doc);
  };

  // AI disabled state
  if (aiEnabled === false) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <RiRobot2Line className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t.aiDisabled}</h2>
          <p className="text-muted-foreground">{t.aiDisabledHint}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (aiEnabled === null) {
    return <AIChatSkeleton />;
  }

  const showPanel = selectedTutorialDoc && docPanelOpen;

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 w-full">
      {/* Left: Chat */}
      <div
        className={
          showPanel
            ? "flex flex-col overflow-hidden min-h-0 w-1/2 flex-shrink-0"
            : "flex flex-col overflow-hidden min-h-0 max-w-4xl mx-auto w-full"
        }
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            {providerInfo && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                <span className="font-medium">{providerInfo.providerName}</span>
                <span className="text-muted-foreground/60">/</span>
                <span>{providerInfo.modelName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ragAvailable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseRagContext(!useRagContext)}
                className={`text-muted-foreground ${useRagContext ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300" : ""}`}
                title={`RAG ${useRagContext ? "ON" : "OFF"}`}
              >
                <Database className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className={`text-muted-foreground ${showStats ? "bg-muted" : ""}`}
              title={t.stats.contextUsage}
            >
              <RiBarChartBoxLine className="w-4 h-4" />
            </Button>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="text-muted-foreground hover:text-destructive"
                title={t.clearChat}
              >
                <RiDeleteBinLine className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ChatMessageList
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
          language={language}
          userName={userName}
          onCopy={handleCopy}
          copiedId={copiedId}
          onSuggestionClick={handleSuggestionClick}
          onTutorialSuggestionClick={handleTutorialSuggestionClick}
          messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
          orgContextAvailable={orgContextAvailable}
          tutorialDocuments={tutorialDocuments}
          selectedTutorialDoc={selectedTutorialDoc}
          error={error}
        />

        {/* Stats Panel */}
        <TokenStatsPanel
          tokenStats={tokenStats}
          showStats={showStats}
          isLoading={isLoading}
          language={language}
        />

        {/* Input area */}
        <ChatInput
          input={input}
          onInputChange={setInput}
          onSubmit={() => handleSubmit()}
          onStop={handleStop}
          onRegenerate={handleRegenerate}
          isLoading={isLoading}
          hasMessages={messages.length > 0}
          useOrgContext={useOrgContext}
          onSetUseOrgContext={setUseOrgContext}
          mentionPopupOpen={mentionPopupOpen}
          onMentionPopupChange={setMentionPopupOpen}
          orgContextAvailable={orgContextAvailable}
          language={language}
          textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
          selectedTutorialDoc={selectedTutorialDoc}
          onSelectTutorialDoc={handleSelectTutorialDoc}
          tutorialDocuments={tutorialDocuments}
          tutorialSelectorOpen={tutorialSelectorOpen}
          onTutorialSelectorOpenChange={setTutorialSelectorOpen}
          tutorialDocsAvailable={tutorialDocsAvailable}
          docPanelOpen={docPanelOpen}
          onToggleDocPanel={() => setDocPanelOpen(!docPanelOpen)}
          useRagContext={useRagContext}
          onSetUseRagContext={setUseRagContext}
          ragDocumentCount={ragDocumentCount}
          onOpenRagDialog={handleOpenRagManager}
        />
      </div>

      {/* Right: Document Panel */}
      {showPanel && (
        <div className="hidden md:flex w-1/2 border-l">
          <TutorialDocumentPanel
            document={selectedTutorialDoc}
            onClose={() => setDocPanelOpen(false)}
            language={language}
          />
        </div>
      )}

      {/* Clear chat confirmation dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.clearChat}</DialogTitle>
            <DialogDescription>{t.clearConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              {language === "ja" ? "キャンセル" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleClearChat}>
              {t.clearChat}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
