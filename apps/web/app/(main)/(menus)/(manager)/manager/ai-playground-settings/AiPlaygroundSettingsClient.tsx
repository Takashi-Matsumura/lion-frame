"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/page-skeleton";

interface LLMConfig {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  contextSize?: number;
}

interface SystemPrompts {
  common: string;
  explain: string;
  idea: string;
  search: string;
  rag: string;
}

interface SearchConfig {
  provider: string;
  braveApiKey?: string;
}

interface RAGConfig {
  baseUrl: string;
  category: string;
}

const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "llama-cpp",
  baseUrl: "http://localhost:8080/v1",
  model: "gemma3",
};

const DEFAULT_RAG_CONFIG: RAGConfig = {
  baseUrl: "http://localhost:8000",
  category: "ai-playground",
};

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  provider: "duckduckgo",
  braveApiKey: "",
};

const PROVIDERS = [
  { id: "lm-studio", name: "LM Studio", defaultUrl: "http://localhost:1234/v1", defaultModel: "local-model" },
  { id: "ollama", name: "Ollama", defaultUrl: "http://localhost:11434/v1", defaultModel: "llama3.2" },
  { id: "llama-cpp", name: "llama.cpp", defaultUrl: "http://localhost:8080/v1", defaultModel: "gemma3" },
];

const translations = {
  en: {
    title: "AI Playground Settings",
    description: "Configure LLM, search, and RAG settings for AI Playground",
    llmSettings: "LLM Settings",
    llmDescription: "Configure the local LLM connection",
    provider: "Provider",
    connectionUrl: "Connection URL",
    modelName: "Model Name",
    apiKey: "API Key (Optional)",
    apiKeyPlaceholder: "Enter if authentication is required",
    testConnection: "Test Connection",
    testing: "Testing...",
    searchSettings: "Search Settings",
    searchDescription: "Configure web search provider",
    searchProvider: "Search Provider",
    braveApiKey: "Brave API Key",
    braveApiKeyPlaceholder: "Enter Brave Search API key",
    ragSettings: "RAG Settings",
    ragDescription: "Configure knowledge base settings",
    ragBaseUrl: "RAG Server URL",
    ragCategory: "Category",
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
    connected: "Connected",
    connectionFailed: "Connection Failed",
    models: "models",
    contextWindow: "Context window",
    promptSettings: "Prompt Settings",
    promptDescription: "Customize system prompts for each mode",
    commonPrompt: "Common Prompt",
    explainPrompt: "Explain Mode",
    ideaPrompt: "Idea Mode",
    searchPrompt: "Search Mode",
    ragPrompt: "RAG Mode",
    resetDefaults: "Reset to Defaults",
  },
  ja: {
    title: "AI体験設定",
    description: "AI体験のLLM・検索・RAG設定を管理します",
    llmSettings: "LLM設定",
    llmDescription: "ローカルLLMの接続設定",
    provider: "プロバイダー",
    connectionUrl: "接続URL",
    modelName: "モデル名",
    apiKey: "APIキー（オプション）",
    apiKeyPlaceholder: "認証が必要な場合のみ入力",
    testConnection: "接続テスト",
    testing: "テスト中...",
    searchSettings: "検索設定",
    searchDescription: "Web検索プロバイダーの設定",
    searchProvider: "検索プロバイダー",
    braveApiKey: "Brave APIキー",
    braveApiKeyPlaceholder: "Brave Search APIキーを入力",
    ragSettings: "RAG設定",
    ragDescription: "ナレッジベースの設定",
    ragBaseUrl: "RAGサーバーURL",
    ragCategory: "カテゴリ",
    save: "保存",
    saving: "保存中...",
    saved: "保存しました",
    connected: "接続成功",
    connectionFailed: "接続失敗",
    models: "モデル",
    contextWindow: "コンテキストウィンドウ",
    promptSettings: "プロンプト設定",
    promptDescription: "各モードのシステムプロンプトをカスタマイズ",
    commonPrompt: "共通プロンプト",
    explainPrompt: "やさしく説明モード",
    ideaPrompt: "企画アイデアモード",
    searchPrompt: "検索して要約モード",
    ragPrompt: "ナレッジ検索モード",
    resetDefaults: "デフォルトに戻す",
  },
};

type TabId = "llm" | "prompts" | "search" | "rag";

export function AiPlaygroundSettingsClient({ language }: { language: "en" | "ja" }) {
  const t = translations[language];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("llm");

  const [llmConfig, setLlmConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);
  const [searchConfig, setSearchConfig] = useState<SearchConfig>(DEFAULT_SEARCH_CONFIG);
  const [ragConfig, setRagConfig] = useState<RAGConfig>(DEFAULT_RAG_CONFIG);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts | null>(null);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    contextSize?: number;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/ai-playground/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.ai_playground_llm_config) setLlmConfig(data.ai_playground_llm_config);
        if (data.ai_playground_search_config) setSearchConfig(data.ai_playground_search_config);
        if (data.ai_playground_rag_config) setRagConfig(data.ai_playground_rag_config);
        if (data.ai_playground_system_prompts) setSystemPrompts(data.ai_playground_system_prompts);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const body: Record<string, unknown> = {
        ai_playground_llm_config: llmConfig,
        ai_playground_search_config: searchConfig,
        ai_playground_rag_config: ragConfig,
      };
      if (systemPrompts) {
        body.ai_playground_system_prompts = systemPrompts;
      }
      await fetch("/api/ai-playground/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [llmConfig, searchConfig, ragConfig, systemPrompts]);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai-playground/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.model,
          provider: llmConfig.provider,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `${data.modelCount} ${t.models}`,
          contextSize: data.contextSize,
        });
        if (data.contextSize) {
          setLlmConfig((prev) => ({ ...prev, contextSize: data.contextSize }));
        }
      } else {
        setTestResult({ success: false, message: data.error || t.connectionFailed });
      }
    } catch {
      setTestResult({ success: false, message: t.connectionFailed });
    } finally {
      setTesting(false);
    }
  }, [llmConfig, t]);

  const handleProviderChange = useCallback((providerId: string) => {
    const preset = PROVIDERS.find((p) => p.id === providerId);
    if (preset) {
      setLlmConfig({
        provider: providerId,
        baseUrl: preset.defaultUrl,
        model: preset.defaultModel,
      });
    }
    setTestResult(null);
  }, []);

  if (loading) return <PageSkeleton />;

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "llm", label: t.llmSettings },
    { id: "prompts", label: t.promptSettings },
    { id: "search", label: t.searchSettings },
    { id: "rag", label: t.ragSettings },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* タブ */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* LLM設定 */}
      {activeTab === "llm" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.llmSettings}</CardTitle>
            <CardDescription>{t.llmDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* プロバイダー選択 */}
            <div className="space-y-2">
              <Label>{t.provider}</Label>
              <div className="flex gap-2">
                {PROVIDERS.map((p) => (
                  <Button
                    key={p.id}
                    variant={llmConfig.provider === p.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleProviderChange(p.id)}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* 接続URL */}
            <div className="space-y-2">
              <Label htmlFor="baseUrl">{t.connectionUrl}</Label>
              <Input
                id="baseUrl"
                value={llmConfig.baseUrl}
                onChange={(e) => setLlmConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
              />
            </div>

            {/* モデル名 */}
            <div className="space-y-2">
              <Label htmlFor="model">{t.modelName}</Label>
              <Input
                id="model"
                value={llmConfig.model}
                onChange={(e) => setLlmConfig((prev) => ({ ...prev, model: e.target.value }))}
              />
            </div>

            {/* APIキー */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">{t.apiKey}</Label>
              <Input
                id="apiKey"
                type="password"
                value={llmConfig.apiKey || ""}
                onChange={(e) => setLlmConfig((prev) => ({ ...prev, apiKey: e.target.value || undefined }))}
                placeholder={t.apiKeyPlaceholder}
              />
            </div>

            {/* 接続テスト */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? t.testing : t.testConnection}
              </Button>
              {testResult && (
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      testResult.success
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }
                  >
                    {testResult.success ? t.connected : t.connectionFailed}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{testResult.message}</span>
                  {testResult.contextSize && (
                    <span className="text-sm text-muted-foreground">
                      ({t.contextWindow}: {testResult.contextSize.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* プロンプト設定 */}
      {activeTab === "prompts" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t.promptSettings}</CardTitle>
                <CardDescription>{t.promptDescription}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSystemPrompts(null)}
              >
                {t.resetDefaults}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(["common", "explain", "idea", "search", "rag"] as const).map((key) => (
              <div key={key} className="space-y-2">
                <Label>
                  {key === "common" ? t.commonPrompt
                    : key === "explain" ? t.explainPrompt
                    : key === "idea" ? t.ideaPrompt
                    : key === "search" ? t.searchPrompt
                    : t.ragPrompt}
                </Label>
                <textarea
                  className="w-full min-h-[120px] p-3 text-sm border border-input rounded-lg bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  value={systemPrompts?.[key] || ""}
                  onChange={(e) =>
                    setSystemPrompts((prev) => ({
                      common: prev?.common || "",
                      explain: prev?.explain || "",
                      idea: prev?.idea || "",
                      search: prev?.search || "",
                      rag: prev?.rag || "",
                      [key]: e.target.value,
                    }))
                  }
                  placeholder={language === "ja" ? "未設定（デフォルトを使用）" : "Not set (using defaults)"}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 検索設定 */}
      {activeTab === "search" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.searchSettings}</CardTitle>
            <CardDescription>{t.searchDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t.searchProvider}</Label>
              <div className="flex gap-2">
                <Button
                  variant={searchConfig.provider === "duckduckgo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchConfig((prev) => ({ ...prev, provider: "duckduckgo" }))}
                >
                  DuckDuckGo
                </Button>
                <Button
                  variant={searchConfig.provider === "brave" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchConfig((prev) => ({ ...prev, provider: "brave" }))}
                >
                  Brave Search
                </Button>
              </div>
            </div>

            {searchConfig.provider === "brave" && (
              <div className="space-y-2">
                <Label htmlFor="braveKey">{t.braveApiKey}</Label>
                <Input
                  id="braveKey"
                  type="password"
                  value={searchConfig.braveApiKey || ""}
                  onChange={(e) =>
                    setSearchConfig((prev) => ({ ...prev, braveApiKey: e.target.value }))
                  }
                  placeholder={t.braveApiKeyPlaceholder}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RAG設定 */}
      {activeTab === "rag" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.ragSettings}</CardTitle>
            <CardDescription>{t.ragDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ragUrl">{t.ragBaseUrl}</Label>
              <Input
                id="ragUrl"
                value={ragConfig.baseUrl}
                onChange={(e) => setRagConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ragCategory">{t.ragCategory}</Label>
              <Input
                id="ragCategory"
                value={ragConfig.category}
                onChange={(e) => setRagConfig((prev) => ({ ...prev, category: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t.saving : saved ? t.saved : t.save}
        </Button>
      </div>
    </div>
  );
}
