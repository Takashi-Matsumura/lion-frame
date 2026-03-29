"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ChatOutput } from "./components/ChatOutput";
import { MetricsDisplay } from "./components/MetricsDisplay";
import { ModeIcon } from "./components/Icons";
import type {
  LLMConfig,
  ChatMode,
  Message,
  SearchResult,
  RAGContext,
  GenerationMetrics,
  SystemPrompts,
  SearchConfig,
  RAGConfig,
} from "../types";
import {
  PROVIDER_PRESETS,
  CHAT_MODES,
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_RAG_CONFIG,
} from "../types";
import { DEFAULT_SYSTEM_PROMPTS } from "../prompts";
import { estimateTokenCount } from "../lib/token-utils";

const DEFAULT_CONTEXT_WINDOW = 4096;

const SUGGESTIONS = {
  ja: {
    explain: ["プログラミングの「変数」って何？", "AIと機械学習の違いを教えて", "インターネットの仕組み"],
    idea: ["高校生向けの学習アプリ", "社内コミュニケーション改善", "新入社員研修プログラム"],
    search: ["2024年のAI技術トレンド", "リモートワークのベストプラクティス"],
    rag: ["ナレッジベースの内容を教えて"],
  },
  en: {
    explain: ["What is a 'variable' in programming?", "Difference between AI and ML", "How does the internet work?"],
    idea: ["Learning app for students", "Improving team communication", "New employee training program"],
    search: ["AI technology trends 2024", "Remote work best practices"],
    rag: ["Tell me about the knowledge base"],
  },
};

export function AiPlaygroundPage({ language }: { language: "en" | "ja" }) {
  const llamaCppPreset = PROVIDER_PRESETS.find((p) => p.provider === "llama-cpp")!;
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: llamaCppPreset.provider,
    baseUrl: llamaCppPreset.baseUrl,
    model: llamaCppPreset.defaultModel,
  });
  const [ragConfig, setRagConfig] = useState<RAGConfig>(DEFAULT_RAG_CONFIG);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts>(DEFAULT_SYSTEM_PROMPTS);
  const [searchConfig, setSearchConfig] = useState<SearchConfig>(DEFAULT_SEARCH_CONFIG);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [mode, setMode] = useState<ChatMode>("explain");
  const [inputValue, setInputValue] = useState("");
  const [metrics, setMetrics] = useState<GenerationMetrics>({
    contextWindowSize: DEFAULT_CONTEXT_WINDOW,
    inputTokens: 0,
    outputTokens: 0,
    contextUsagePercent: 0,
    tokensPerSecond: 0,
    totalTimeMs: 0,
    isGenerating: false,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationStartTimeRef = useRef<number>(0);
  const lastTokenCountRef = useRef<number>(0);
  const lastTokenTimeRef = useRef<number>(0);

  const ragEnabled = ragConfig.baseUrl !== "";

  const availableModes = useMemo(() => {
    return CHAT_MODES.filter((m) => m.id !== "rag" || ragEnabled);
  }, [ragEnabled]);

  useEffect(() => {
    fetch("/api/ai-playground/settings")
      .then((r) => r.json())
      .then((pgData) => {
        setAiEnabled(pgData.ai_enabled === true || pgData.ai_enabled === "true");
        if (pgData.ai_playground_llm_config) setLlmConfig(pgData.ai_playground_llm_config);
        if (pgData.ai_playground_search_config) setSearchConfig({ ...DEFAULT_SEARCH_CONFIG, ...pgData.ai_playground_search_config });
        if (pgData.ai_playground_rag_config) setRagConfig({ ...DEFAULT_RAG_CONFIG, ...pgData.ai_playground_rag_config });
        if (pgData.ai_playground_system_prompts) setSystemPrompts({ ...DEFAULT_SYSTEM_PROMPTS, ...pgData.ai_playground_system_prompts });
      })
      .finally(() => setConfigLoaded(true));
  }, []);

  useEffect(() => {
    const contextSize = llmConfig.contextSize || DEFAULT_CONTEXT_WINDOW;
    setMetrics((prev) => ({
      ...prev,
      contextWindowSize: contextSize,
      contextUsagePercent: ((prev.inputTokens + prev.outputTokens) / contextSize) * 100,
    }));
  }, [llmConfig.contextSize]);

  const focusInput = useCallback(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamingContent) {
      setMessages((prev) => [...prev, { role: "assistant", content: streamingContent + "\n\n[中断されました]" }]);
    }
    setIsLoading(false);
    setStreamingContent("");
    focusInput();
  }, [streamingContent, focusInput]);

  const handleSubmit = useCallback(
    async (message: string, selectedMode: ChatMode) => {
      if (!message.trim() || isLoading) return;

      setIsLoading(true);
      setStreamingContent("");
      setInputValue("");

      const historyTokens = messages.reduce((sum: number, msg: Message) => sum + estimateTokenCount(msg.content), 0);
      const inputTokens = estimateTokenCount(message) + historyTokens;
      generationStartTimeRef.current = Date.now();
      lastTokenCountRef.current = 0;
      lastTokenTimeRef.current = Date.now();

      setMetrics((prev) => ({
        ...prev,
        inputTokens,
        outputTokens: 0,
        contextUsagePercent: (inputTokens / prev.contextWindowSize) * 100,
        tokensPerSecond: 0,
        totalTimeMs: 0,
        isGenerating: true,
      }));

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setMessages((prev) => [...prev, { role: "user", content: message }]);

      let searchResults: SearchResult[] = [];
      let ragContext: RAGContext[] = [];

      try {
        if (selectedMode === "search") {
          setStreamingContent(language === "ja" ? "[検索中...]" : "[Searching...]");
          const searchResponse = await fetch("/api/ai-playground/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: message, numResults: 3, fetchContent: true, searchConfig }),
            signal,
          });
          const searchData = await searchResponse.json();
          if (searchData.error) throw new Error(searchData.error);
          searchResults = searchData.results;
          if (searchResults.length === 0) throw new Error(language === "ja" ? "検索結果が見つかりませんでした" : "No search results found");
          setStreamingContent(language === "ja" ? "[要約を作成中...]" : "[Summarizing...]");
        }

        if (ragEnabled && selectedMode === "rag") {
          setStreamingContent(language === "ja" ? "[ナレッジベース検索中...]" : "[Searching knowledge base...]");
          const ragResponse = await fetch("/api/ai-playground/rag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: message, topK: 5, threshold: 0.3, category: ragConfig.category || undefined, ragBaseUrl: ragConfig.baseUrl }),
            signal,
          });
          const ragData = await ragResponse.json();
          if (ragData.error) throw new Error(ragData.error);
          ragContext = ragData.context || [];
          setStreamingContent(language === "ja" ? "[回答を生成中...]" : "[Generating response...]");
        }

        const response = await fetch("/api/ai-playground/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            mode: selectedMode,
            llmConfig,
            searchResults: selectedMode === "search" ? searchResults : undefined,
            ragContext: ragContext.length > 0 ? ragContext : undefined,
            history: messages,
            systemPrompts,
          }),
          signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "LLM接続エラー");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("レスポンスの読み取りに失敗しました");

        const decoder = new TextDecoder();
        let content = "";

        while (true) {
          if (signal.aborted) { reader.cancel(); break; }
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.trim() || line === "data: [DONE]" || !line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.content) {
                content += data.content;
                setStreamingContent(content);
                const currentTime = Date.now();
                const outputTokens = estimateTokenCount(content);
                const timeSinceLastUpdate = currentTime - lastTokenTimeRef.current;
                if (timeSinceLastUpdate > 100) {
                  const tokensSinceLastUpdate = outputTokens - lastTokenCountRef.current;
                  lastTokenCountRef.current = outputTokens;
                  lastTokenTimeRef.current = currentTime;
                  setMetrics((prev) => ({
                    ...prev,
                    outputTokens,
                    contextUsagePercent: ((prev.inputTokens + outputTokens) / prev.contextWindowSize) * 100,
                    tokensPerSecond: (tokensSinceLastUpdate / timeSinceLastUpdate) * 1000,
                    totalTimeMs: currentTime - generationStartTimeRef.current,
                  }));
                }
              }
            } catch { /* skip */ }
          }
        }

        if (!signal.aborted) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content,
              sources: selectedMode === "search" ? searchResults : undefined,
              ragSources: ragContext.length > 0 ? ragContext : undefined,
            },
          ]);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        const errorMessage = error instanceof Error ? error.message : "不明なエラー";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: language === "ja"
              ? `**エラーが発生しました**\n\n${errorMessage}\n\n- LLMが起動しているか確認してください\n- 管理者に接続設定を確認してください`
              : `**An error occurred**\n\n${errorMessage}\n\n- Check if the LLM server is running\n- Ask your administrator to verify settings`,
          },
        ]);
      } finally {
        abortControllerRef.current = null;
        setIsLoading(false);
        setStreamingContent("");
        const finalTime = Date.now() - generationStartTimeRef.current;
        setMetrics((prev) => ({
          ...prev,
          totalTimeMs: finalTime,
          isGenerating: false,
          tokensPerSecond: finalTime > 0 ? (prev.outputTokens / finalTime) * 1000 : 0,
        }));
        focusInput();
      }
    },
    [llmConfig, focusInput, messages, ragConfig, ragEnabled, systemPrompts, searchConfig, language, isLoading],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setMetrics({
      contextWindowSize: llmConfig.contextSize || DEFAULT_CONTEXT_WINDOW,
      inputTokens: 0,
      outputTokens: 0,
      contextUsagePercent: 0,
      tokensPerSecond: 0,
      totalTimeMs: 0,
      isGenerating: false,
    });
  }, [llmConfig.contextSize]);

  const handleSuggestionClick = useCallback((text: string) => {
    handleSubmit(text, mode);
  }, [handleSubmit, mode]);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(inputValue, mode);
  }, [handleSubmit, inputValue, mode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(inputValue, mode);
    }
  }, [handleSubmit, inputValue, mode]);

  if (!configLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ height: "calc(100vh - 160px)" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (aiEnabled === false) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ height: "calc(100vh - 160px)" }}>
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {language === "ja" ? "AIが有効になっていません" : "AI is not enabled"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === "ja" ? "AI設定でAIを有効にしてください" : "Please enable AI in AI Settings"}
          </p>
        </div>
      </div>
    );
  }

  const hasMessages = messages.length > 0 || isLoading;
  const currentSuggestions = SUGGESTIONS[language][mode] || [];
  const currentModeInfo = CHAT_MODES.find((m) => m.id === mode);

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 w-full" style={{ height: "calc(100vh - 160px)" }}>
      <div className="flex flex-col overflow-hidden min-h-0 max-w-4xl mx-auto w-full">
        {/* ヘッダーバー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-1.5">
            {availableModes.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  mode === m.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <ModeIcon icon={m.icon} />
                {m.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {language === "ja" ? "クリア" : "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* メッセージエリア / ウェルカム */}
        {hasMessages ? (
          <div className="flex-1 overflow-hidden min-h-0">
            <ChatOutput messages={messages} isLoading={isLoading} streamingContent={streamingContent} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">AI Playground</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {currentModeInfo && (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-primary"><ModeIcon icon={currentModeInfo.icon} /></span>
                    {currentModeInfo.name}
                  </span>
                )}
                {" "}{language === "ja" ? "モードで質問してみましょう" : "mode — try asking a question"}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {currentSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 text-sm border border-border rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* メトリクスバー */}
        {(metrics.inputTokens > 0 || metrics.isGenerating) && (
          <div className="flex-shrink-0 px-4 py-2 border-t border-border bg-muted/30">
            <MetricsDisplay metrics={metrics} />
          </div>
        )}

        {/* 入力エリア */}
        <div className="flex-shrink-0 border-t border-border px-4 py-4">
          <form onSubmit={handleFormSubmit} className="flex gap-2 items-end">
            {isLoading ? (
              <button
                type="button"
                onClick={handleCancel}
                className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center border border-border hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
            ) : null}
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                language === "ja"
                  ? (mode === "explain" ? "何について知りたいですか？"
                    : mode === "idea" ? "企画のテーマや条件を入力..."
                    : mode === "search" ? "何を調べますか？"
                    : mode === "rag" ? "ナレッジベースに質問..."
                    : "メッセージを入力...")
                  : "Type your message..."
              }
              className="w-full resize-none rounded-xl border border-input px-4 py-[14px] text-sm max-h-[200px] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={1}
              disabled={isLoading}
              style={{ minHeight: "48px" }}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            {language === "ja" ? "学習支援ツールです。最終判断は人が行ってください" : "This is a learning tool. Final decisions should be made by humans"}
          </p>
        </div>
      </div>
    </div>
  );
}
