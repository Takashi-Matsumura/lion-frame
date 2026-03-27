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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_SYSTEM_PROMPTS } from "@lionframe/addon-ai-playground/src/prompts";
import type { SystemPrompts, SearchConfig, RAGConfig } from "@lionframe/addon-ai-playground";
import { DEFAULT_SEARCH_CONFIG, DEFAULT_RAG_CONFIG } from "@lionframe/addon-ai-playground/src/types";
import { AiSettingsSkeleton } from "./AiSettingsSkeleton";
import type { TabId } from "./types";

interface AIConfig {
  enabled: boolean;
  provider: "openai" | "anthropic" | "local";
  model: string;
  hasApiKey: boolean;
  apiKey?: string;
  localProvider: "llama.cpp" | "lm-studio" | "ollama";
  localEndpoint: string;
  localModel: string;
}

interface LocalLLMDefaults {
  [key: string]: { endpoint: string; model: string };
}

const EMPTY_PROMPTS: SystemPrompts = { common: "", explain: "", idea: "", search: "", rag: "" };

const PROMPT_KEYS = ["common", "explain", "idea", "search", "rag"] as const;

const translations = {
  en: {
    generalTitle: "General AI Settings",
    generalDescription: "Configure AI features for the entire system",
    enableAi: "Enable AI Features",
    enableAiDesc: "Enable AI-powered features like translation.",
    aiProvider: "AI Provider",
    localLlm: "Local LLM",
    recommended: "Recommended",
    localServer: "Local LLM Server",
    default: "Default",
    endpointUrl: "Endpoint URL",
    modelName: "Model Name",
    testConnection: "Test Connection",
    testing: "Testing...",
    aiModel: "Model",
    apiKeyLabel: "API Key",
    removeKey: "Remove",
    setKey: "Set",
    aiAvailable: "AI features are available",
    aiDisabled: "AI features are disabled",
    connectionFailed: "Connection Failed",
    searchSettings: "Search Settings",
    searchProvider: "Search Provider",
    braveApiKey: "Brave API Key",
    braveApiKeyPlaceholder: "Enter Brave Search API key",
    ragSettings: "RAG Settings",
    ragBaseUrl: "RAG Server URL",
    ragCategory: "Category",
    promptTitle: "Prompt Settings",
    promptDescription: "Customize system prompts for each AI Playground mode",
    promptLabels: { common: "Common Prompt", explain: "Explain Mode", idea: "Idea Mode", search: "Search Mode", rag: "RAG Mode" },
    resetDefaults: "Reset to Defaults",
    defaultPrompt: "Default",
    customPrompt: "Custom",
    promptPlaceholder: "Not set (using defaults)",
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
  },
  ja: {
    generalTitle: "全般AI設定",
    generalDescription: "システム全体のAI機能を設定します",
    enableAi: "AI機能を有効化",
    enableAiDesc: "翻訳などのAI機能を有効にします。",
    aiProvider: "AIプロバイダ",
    localLlm: "ローカルLLM",
    recommended: "推奨",
    localServer: "ローカルLLMサーバ",
    default: "デフォルト",
    endpointUrl: "エンドポイントURL",
    modelName: "モデル名",
    testConnection: "接続テスト",
    testing: "テスト中...",
    aiModel: "モデル",
    apiKeyLabel: "APIキー",
    removeKey: "削除",
    setKey: "設定",
    aiAvailable: "AI機能が利用可能です",
    aiDisabled: "AI機能は無効です",
    connectionFailed: "接続失敗",
    searchSettings: "検索設定",
    searchProvider: "検索プロバイダー",
    braveApiKey: "Brave APIキー",
    braveApiKeyPlaceholder: "Brave Search APIキーを入力",
    ragSettings: "RAG設定",
    ragBaseUrl: "RAGサーバーURL",
    ragCategory: "カテゴリ",
    promptTitle: "プロンプト設定",
    promptDescription: "AI体験の各モードのシステムプロンプトをカスタマイズ",
    promptLabels: { common: "共通プロンプト", explain: "やさしく説明モード", idea: "企画アイデアモード", search: "検索して要約モード", rag: "ナレッジ検索モード" },
    resetDefaults: "デフォルトに戻す",
    defaultPrompt: "デフォルト",
    customPrompt: "カスタム",
    promptPlaceholder: "未設定（デフォルトを使用）",
    save: "保存",
    saving: "保存中...",
    saved: "保存しました",
  },
};

export function AiSettingsClient({ language, tab }: { language: "en" | "ja"; tab: TabId }) {
  const t = translations[language];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [localLLMDefaults, setLocalLLMDefaults] = useState<LocalLLMDefaults | null>(null);
  const [aiApiKeyInput, setAiApiKeyInput] = useState("");
  const [generalTestResult, setGeneralTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [generalTesting, setGeneralTesting] = useState(false);

  const [searchConfig, setSearchConfig] = useState<SearchConfig>(DEFAULT_SEARCH_CONFIG);
  const [ragConfig, setRagConfig] = useState<RAGConfig>(DEFAULT_RAG_CONFIG);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts | null>(null);

  useEffect(() => {
    const fetches: Promise<Record<string, unknown>>[] = [
      fetch("/api/admin/ai").then((r) => r.json()),
    ];
    if (tab === "playground") {
      fetches.push(fetch("/api/ai-playground/settings").then((r) => r.json()));
    }
    Promise.all(fetches)
      .then(([aiData, pgData]) => {
        if (aiData.config) setAiConfig(aiData.config as AIConfig);
        if (aiData.localLLMDefaults) setLocalLLMDefaults(aiData.localLLMDefaults as LocalLLMDefaults);
        if (pgData) {
          if (pgData.ai_playground_search_config) setSearchConfig(pgData.ai_playground_search_config as SearchConfig);
          if (pgData.ai_playground_rag_config) setRagConfig(pgData.ai_playground_rag_config as RAGConfig);
          if (pgData.ai_playground_system_prompts) setSystemPrompts(pgData.ai_playground_system_prompts as SystemPrompts);
        }
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const handleUpdateAiConfig = useCallback(async (updates: Partial<AIConfig & { apiKey?: string }>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      if (res.ok) { const data = await res.json(); setAiConfig(data.config); setAiApiKeyInput(""); setGeneralTestResult(null); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setSaving(false); }
  }, []);

  const handleTestGeneral = useCallback(async () => {
    setGeneralTesting(true); setGeneralTestResult(null);
    try {
      const res = await fetch("/api/admin/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test-connection" }) });
      const data = await res.json();
      setGeneralTestResult({ success: data.success, message: data.success ? (language === "ja" ? "接続成功" : "Connected") : (data.error || t.connectionFailed) });
    } catch { setGeneralTestResult({ success: false, message: t.connectionFailed }); }
    finally { setGeneralTesting(false); }
  }, [language, t]);

  const handleSavePlayground = useCallback(async () => {
    setSaving(true); setSaved(false);
    try {
      const body: Record<string, unknown> = { ai_playground_search_config: searchConfig, ai_playground_rag_config: ragConfig };
      if (systemPrompts) body.ai_playground_system_prompts = systemPrompts;
      await fetch("/api/ai-playground/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }, [searchConfig, ragConfig, systemPrompts]);

  if (loading) return <AiSettingsSkeleton tab={tab} />;

  return (
    <div className={`${tab === "playground" ? "max-w-6xl" : "max-w-4xl"} mx-auto mt-8 space-y-6`}>

      {tab === "general" && aiConfig && (
        <Card>
          <CardHeader>
            <CardTitle>{t.generalTitle}</CardTitle>
            <CardDescription>{t.generalDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{t.enableAi}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.enableAiDesc}</p>
                </div>
                <Switch checked={aiConfig.enabled} onCheckedChange={(checked) => handleUpdateAiConfig({ enabled: checked })} disabled={saving} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.aiProvider}</Label>
              <Select value={aiConfig.provider} onValueChange={(value) => handleUpdateAiConfig({ provider: value as "openai" | "anthropic" | "local" })} disabled={saving}>
                <SelectTrigger className="w-full md:w-[300px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">{t.localLlm} ({t.recommended})</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {aiConfig.provider === "local" && (
              <>
                <div className="space-y-2">
                  <Label>{t.localServer}</Label>
                  <Select value={aiConfig.localProvider} onValueChange={(value) => { const p = value as "llama.cpp" | "lm-studio" | "ollama"; const d = localLLMDefaults?.[p]; handleUpdateAiConfig({ localProvider: p, localEndpoint: d?.endpoint || "", localModel: d?.model || "" }); }} disabled={saving}>
                    <SelectTrigger className="w-full md:w-[300px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama.cpp">llama.cpp ({t.default})</SelectItem>
                      <SelectItem value="lm-studio">LM Studio</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.endpointUrl}</Label>
                  <Input value={aiConfig.localEndpoint} onChange={(e) => handleUpdateAiConfig({ localEndpoint: e.target.value })} className="font-mono" disabled={saving} />
                </div>
                <div className="space-y-2">
                  <Label>{t.modelName}</Label>
                  <Input value={aiConfig.localModel} onChange={(e) => handleUpdateAiConfig({ localModel: e.target.value })} disabled={saving} />
                </div>
              </>
            )}

            {aiConfig.provider !== "local" && (
              <>
                <div className="space-y-2">
                  <Label>{t.aiModel}</Label>
                  <Select value={aiConfig.model} onValueChange={(value) => handleUpdateAiConfig({ model: value })} disabled={saving}>
                    <SelectTrigger className="w-full md:w-[300px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {aiConfig.provider === "openai" && <><SelectItem value="gpt-4o-mini">GPT-4o mini ({t.recommended})</SelectItem><SelectItem value="gpt-4o">GPT-4o</SelectItem></>}
                      {aiConfig.provider === "anthropic" && <><SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku ({t.recommended})</SelectItem><SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem></>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.apiKeyLabel}</Label>
                  {aiConfig.hasApiKey ? (
                    <div className="flex items-center gap-4">
                      <Input value={aiConfig.apiKey || ""} disabled className="flex-1 font-mono" />
                      <Button variant="outline" onClick={() => handleUpdateAiConfig({ apiKey: "" })} disabled={saving}>{t.removeKey}</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <Input type="password" value={aiApiKeyInput} onChange={(e) => setAiApiKeyInput(e.target.value)} placeholder="sk-..." className="flex-1" />
                      <Button variant="outline" onClick={() => handleUpdateAiConfig({ apiKey: aiApiKeyInput })} disabled={saving || !aiApiKeyInput}>{t.setKey}</Button>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleTestGeneral} disabled={generalTesting || saving}>{generalTesting ? t.testing : t.testConnection}</Button>
              {generalTestResult && (
                <Badge className={generalTestResult.success ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}>
                  {generalTestResult.message}
                </Badge>
              )}
            </div>

            <div className={`flex items-center gap-2 p-4 rounded-lg ${aiConfig.enabled ? "bg-green-50 dark:bg-green-950/30" : "bg-muted"}`}>
              <span className={`w-2 h-2 rounded-full ${aiConfig.enabled ? "bg-green-500" : "bg-muted-foreground"}`} />
              <span className="text-sm">{aiConfig.enabled ? t.aiAvailable : t.aiDisabled}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "playground" && (
        <>
          <Card>
            <CardHeader><CardTitle>{t.searchSettings}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t.searchProvider}</Label>
                <div className="flex gap-2">
                  <Button variant={searchConfig.provider === "duckduckgo" ? "default" : "outline"} size="sm" onClick={() => setSearchConfig((prev) => ({ ...prev, provider: "duckduckgo" }))}>DuckDuckGo</Button>
                  <Button variant={searchConfig.provider === "brave" ? "default" : "outline"} size="sm" onClick={() => setSearchConfig((prev) => ({ ...prev, provider: "brave" }))}>Brave Search</Button>
                </div>
              </div>
              {searchConfig.provider === "brave" && (
                <div className="space-y-2"><Label>{t.braveApiKey}</Label><Input type="password" value={searchConfig.braveApiKey || ""} onChange={(e) => setSearchConfig((prev) => ({ ...prev, braveApiKey: e.target.value }))} placeholder={t.braveApiKeyPlaceholder} /></div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t.ragSettings}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>{t.ragBaseUrl}</Label><Input value={ragConfig.baseUrl} onChange={(e) => setRagConfig((prev) => ({ ...prev, baseUrl: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t.ragCategory}</Label><Input value={ragConfig.category} onChange={(e) => setRagConfig((prev) => ({ ...prev, category: e.target.value }))} /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>{t.promptTitle}</CardTitle><CardDescription>{t.promptDescription}</CardDescription></div>
                <Button variant="outline" size="sm" onClick={() => setSystemPrompts(null)}>{t.resetDefaults}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {PROMPT_KEYS.map((key) => (
                <div key={key} className="space-y-2">
                  <Label>{t.promptLabels[key]}</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">{t.defaultPrompt}</span>
                      <Textarea
                        className="min-h-[120px] bg-muted text-muted-foreground font-mono"
                        value={DEFAULT_SYSTEM_PROMPTS[key]}
                        readOnly
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">{t.customPrompt}</span>
                      <Textarea
                        className="min-h-[120px] font-mono"
                        value={systemPrompts?.[key] || ""}
                        onChange={(e) => setSystemPrompts((prev) => ({ ...EMPTY_PROMPTS, ...prev, [key]: e.target.value }))}
                        placeholder={t.promptPlaceholder}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-end"><Button onClick={handleSavePlayground} disabled={saving}>{saving ? t.saving : saved ? t.saved : t.save}</Button></div>
        </>
      )}
    </div>
  );
}
