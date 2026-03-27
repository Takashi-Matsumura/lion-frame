"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatInput, type ChatInputRef } from "./components/ChatInput";
import { ChatOutput } from "./components/ChatOutput";
import { MetricsDisplay } from "./components/MetricsDisplay";
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
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_RAG_CONFIG,
} from "../types";
import { DEFAULT_SYSTEM_PROMPTS } from "../prompts";
import { estimateTokenCount } from "../lib/token-utils";

const DEFAULT_CONTEXT_WINDOW = 4096;

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
  const [configLoaded, setConfigLoaded] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [metrics, setMetrics] = useState<GenerationMetrics>({
    contextWindowSize: DEFAULT_CONTEXT_WINDOW,
    inputTokens: 0,
    outputTokens: 0,
    contextUsagePercent: 0,
    tokensPerSecond: 0,
    totalTimeMs: 0,
    isGenerating: false,
  });

  const chatInputRef = useRef<ChatInputRef>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationStartTimeRef = useRef<number>(0);
  const lastTokenCountRef = useRef<number>(0);
  const lastTokenTimeRef = useRef<number>(0);

  // サーバーから設定を読み込み
  useEffect(() => {
    fetch("/api/ai-playground/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.ai_playground_llm_config) setLlmConfig(data.ai_playground_llm_config);
        if (data.ai_playground_search_config) setSearchConfig({ ...DEFAULT_SEARCH_CONFIG, ...data.ai_playground_search_config });
        if (data.ai_playground_rag_config) setRagConfig({ ...DEFAULT_RAG_CONFIG, ...data.ai_playground_rag_config });
        if (data.ai_playground_system_prompts) setSystemPrompts({ ...DEFAULT_SYSTEM_PROMPTS, ...data.ai_playground_system_prompts });
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
    setTimeout(() => chatInputRef.current?.focus(), 100);
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

  const ragEnabled = ragConfig.baseUrl !== "";

  const handleSubmit = useCallback(
    async (message: string, mode: ChatMode | null) => {
      setIsLoading(true);
      setStreamingContent("");

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
        if (mode === "search") {
          setStreamingContent("[検索中...]");
          const searchResponse = await fetch("/api/ai-playground/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: message, numResults: 3, fetchContent: true, searchConfig }),
            signal,
          });
          const searchData = await searchResponse.json();
          if (searchData.error) throw new Error(searchData.error);
          searchResults = searchData.results;
          if (searchResults.length === 0) throw new Error("検索結果が見つかりませんでした");
          setStreamingContent("[要約を作成中...]");
        }

        if (ragEnabled && mode === "rag") {
          setStreamingContent("[ナレッジベース検索中...]");
          const ragResponse = await fetch("/api/ai-playground/rag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: message, topK: 5, threshold: 0.3, category: ragConfig.category || undefined, ragBaseUrl: ragConfig.baseUrl }),
            signal,
          });
          const ragData = await ragResponse.json();
          if (ragData.error) throw new Error(ragData.error);
          ragContext = ragData.context || [];
          setStreamingContent("[回答を生成中...]");
        }

        const response = await fetch("/api/ai-playground/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            mode,
            llmConfig,
            searchResults: mode === "search" ? searchResults : undefined,
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
              sources: mode === "search" ? searchResults : undefined,
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
              ? `[エラー] エラーが発生しました\n\n**原因**: ${errorMessage}\n\n**解決方法**:\n- LLMが起動しているか確認してください\n- 管理者に接続設定を確認してください`
              : `[Error] An error occurred\n\n**Cause**: ${errorMessage}\n\n**Solution**:\n- Check if the LLM server is running\n- Ask your administrator to verify the connection settings`,
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
    [llmConfig, focusInput, messages, ragConfig, ragEnabled, systemPrompts, searchConfig, language],
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

  if (!configLoaded) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 160px)" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      {/* ツールバー */}
      {messages.length > 0 && (
        <div className="flex items-center justify-end gap-2 mb-3">
          <button
            onClick={clearMessages}
            className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {language === "ja" ? "クリア" : "Clear"}
          </button>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden rounded-lg border border-border">
        {/* 左側：入力 */}
        <div className="w-[360px] border-r border-border bg-card p-4 flex flex-col">
          <ChatInput
            ref={chatInputRef}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onCancel={handleCancel}
            ragEnabled={ragEnabled}
            searchConfig={searchConfig}
          />
        </div>

        {/* 右側：出力 */}
        <div className="flex-1 bg-card overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ChatOutput messages={messages} isLoading={isLoading} streamingContent={streamingContent} />
          </div>
          <div className="border-t border-border px-4 py-2 bg-muted/30 flex justify-center">
            <MetricsDisplay metrics={metrics} />
          </div>
        </div>
      </div>
    </div>
  );
}
