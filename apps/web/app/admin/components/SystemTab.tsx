"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AIConfig, LocalLLMDefaults } from "@/types/admin";
import { DependencyHealthSection } from "./DependencyHealthSection";
import { ModuleHealthOverview } from "./ModuleHealthOverview";
import { TutorialDocumentsManager } from "./TutorialDocumentsManager";

interface SystemTabProps {
  language: "en" | "ja";
}

export function SystemTab({ language }: SystemTabProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // Google OAuth設定
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const [googleOAuthLoading, setGoogleOAuthLoading] = useState(false);

  // GitHub OAuth設定
  const [gitHubOAuthEnabled, setGitHubOAuthEnabled] = useState(false);
  const [gitHubOAuthLoading, setGitHubOAuthLoading] = useState(false);

  // AI設定の状態
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [aiApiKeyInput, setAiApiKeyInput] = useState("");
  const [localLLMDefaults, setLocalLLMDefaults] =
    useState<LocalLLMDefaults | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [aiSaving, setAiSaving] = useState(false);

  // システムバージョン
  const [systemVersions, setSystemVersions] = useState<Record<string, string> | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(true);

  // アコーディオン開閉
  const [authSettingsOpen, setAuthSettingsOpen] = useState(false);
  const [depHealthOpen, setDepHealthOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  // Google OAuth設定を取得
  const fetchGoogleOAuthSetting = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/google-oauth");
      if (response.ok) {
        const data = await response.json();
        setGoogleOAuthEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Error fetching Google OAuth setting:", error);
    }
  }, []);

  // Google OAuth設定を切り替え
  const handleGoogleOAuthToggle = useCallback(async (enabled: boolean) => {
    setGoogleOAuthLoading(true);
    try {
      const response = await fetch("/api/admin/google-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) {
        setGoogleOAuthEnabled(enabled);
      }
    } catch (error) {
      console.error("Error updating Google OAuth setting:", error);
    } finally {
      setGoogleOAuthLoading(false);
    }
  }, []);

  // GitHub OAuth設定を取得
  const fetchGitHubOAuthSetting = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/github-oauth");
      if (response.ok) {
        const data = await response.json();
        setGitHubOAuthEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Error fetching GitHub OAuth setting:", error);
    }
  }, []);

  // GitHub OAuth設定を切り替え
  const handleGitHubOAuthToggle = useCallback(async (enabled: boolean) => {
    setGitHubOAuthLoading(true);
    try {
      const response = await fetch("/api/admin/github-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) {
        setGitHubOAuthEnabled(enabled);
      }
    } catch (error) {
      console.error("Error updating GitHub OAuth setting:", error);
    } finally {
      setGitHubOAuthLoading(false);
    }
  }, []);

  // AI設定を取得
  const fetchAiConfig = useCallback(async () => {
    try {
      setAiConfigLoading(true);
      const response = await fetch("/api/admin/ai");
      if (!response.ok) {
        throw new Error("Failed to fetch AI config");
      }

      const data = await response.json();
      setAiConfig(data.config);
      if (data.localLLMDefaults) {
        setLocalLLMDefaults(data.localLLMDefaults);
      }
    } catch (error) {
      console.error("Error fetching AI config:", error);
    } finally {
      setAiConfigLoading(false);
    }
  }, []);

  // AI設定を更新
  const handleUpdateAiConfig = async (
    updates: Partial<AIConfig & { apiKey?: string }>,
  ) => {
    try {
      setAiSaving(true);
      const response = await fetch("/api/admin/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update AI config");
      }

      const data = await response.json();
      setAiConfig(data.config);
      setAiApiKeyInput("");
      setConnectionTestResult(null);
    } catch (error) {
      console.error("Error updating AI config:", error);
      alert(t("Failed to update AI settings", "AI設定の更新に失敗しました"));
    } finally {
      setAiSaving(false);
    }
  };

  // ローカルLLM接続テスト
  const handleTestLocalConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionTestResult(null);

      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-connection" }),
      });

      const result = await response.json();
      setConnectionTestResult(result);
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionTestResult({
        success: false,
        message: t("Connection test failed", "接続テストに失敗しました"),
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // システムバージョンを取得
  const fetchSystemVersions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system-versions");
      if (res.ok) {
        const data = await res.json();
        setSystemVersions(data);
      }
    } catch (error) {
      console.error("Error fetching system versions:", error);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  // マウント時にOAuth設定とAI設定を取得
  useEffect(() => {
    fetchGoogleOAuthSetting();
    fetchGitHubOAuthSetting();
    fetchAiConfig();
    fetchSystemVersions();
  }, [fetchGoogleOAuthSetting, fetchGitHubOAuthSetting, fetchAiConfig, fetchSystemVersions]);

  return (
    <Card>
      <CardContent className="p-8">
        {/* システム情報 */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold">
            {t("System Information", "システム情報")}
          </h2>

          <div className="p-6 bg-muted rounded-lg">
            {versionsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t("Loading...", "読み込み中...")}
                </span>
              </div>
            ) : (
              <div className="space-y-3 text-muted-foreground">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="font-medium">
                    {t("Framework", "フレームワーク")}
                  </span>
                  <span className="font-mono text-sm">
                    {systemVersions?.framework ?? "Next.js (App Router)"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="font-medium">
                    {t("Runtime", "ランタイム")}
                  </span>
                  <span className="font-mono text-sm">
                    {systemVersions?.runtime ?? "React"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="font-medium">
                    {t("Database", "データベース")}
                  </span>
                  <span className="font-mono text-sm">
                    {systemVersions?.database ?? "PostgreSQL (Prisma ORM)"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="font-medium">
                    {t("Authentication", "認証")}
                  </span>
                  <span className="font-mono text-sm">
                    {systemVersions?.auth ?? "Auth.js (NextAuth.js v5)"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="font-medium">
                    {t("Styling", "スタイリング")}
                  </span>
                  <span className="font-mono text-sm">
                    {systemVersions?.styling ?? "Tailwind CSS"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">
                    {t("Language", "言語")}
                  </span>
                  <span className="font-mono text-sm">
                    {systemVersions?.language ?? "TypeScript"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* モジュールヘルスチェック */}
        <div className="mt-8 space-y-2">
          <h2 className="text-base font-semibold">
            {t("Module Health", "モジュールヘルス")}
          </h2>
          <ModuleHealthOverview language={language} />
        </div>

        {/* 依存関係ヘルス */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setDepHealthOpen(!depHealthOpen)}
            className="flex items-center gap-2 w-full text-left cursor-pointer"
          >
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${depHealthOpen ? "" : "-rotate-90"}`}
            />
            <h2 className="text-base font-semibold">
              {t("Dependency Health", "依存関係ヘルス")}
            </h2>
          </button>

          {depHealthOpen && <DependencyHealthSection language={language} />}
        </div>

        {/* 認証設定 */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setAuthSettingsOpen(!authSettingsOpen)}
            className="flex items-center gap-2 w-full text-left cursor-pointer"
          >
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${authSettingsOpen ? "" : "-rotate-90"}`}
            />
            <h2 className="text-base font-semibold">
              {t("Authentication Settings", "認証設定")}
            </h2>
          </button>

          {authSettingsOpen && (
            <div className="space-y-4 mt-4">
              <div className="p-6 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      Google OAuth
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "Enable Google OAuth login on the login page",
                        "ログイン画面でGoogle OAuthログインを有効にする",
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={googleOAuthEnabled}
                    onCheckedChange={handleGoogleOAuthToggle}
                    disabled={googleOAuthLoading}
                  />
                </div>
                {!googleOAuthEnabled && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                    {t(
                      "To enable Google OAuth, configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment variables.",
                      "Google OAuthを有効にするには、環境変数にGOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを設定してください。",
                    )}
                  </p>
                )}
              </div>

              {/* GitHub OAuth */}
              <div className="p-6 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      GitHub OAuth
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "Enable GitHub OAuth login on the login page",
                        "ログイン画面でGitHub OAuthログインを有効にする",
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={gitHubOAuthEnabled}
                    onCheckedChange={handleGitHubOAuthToggle}
                    disabled={gitHubOAuthLoading}
                  />
                </div>
                {!gitHubOAuthEnabled && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                    {t(
                      "To enable GitHub OAuth, configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the environment variables.",
                      "GitHub OAuthを有効にするには、環境変数にGITHUB_CLIENT_IDとGITHUB_CLIENT_SECRETを設定してください。",
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI設定 */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setAiSettingsOpen(!aiSettingsOpen)}
            className="flex items-center gap-2 w-full text-left cursor-pointer"
          >
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${aiSettingsOpen ? "" : "-rotate-90"}`}
            />
            <h2 className="text-base font-semibold">
              {t("AI Settings", "AI設定")}
            </h2>
          </button>

          {aiSettingsOpen && (
            <>
              {aiConfigLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("Loading...", "読み込み中...")}
                  </p>
                </div>
              )}

              {!aiConfigLoading && aiConfig && (
                <div className="space-y-4 mt-4">
                  {/* 有効/無効 */}
                  <div className="p-6 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">
                          {t("Enable AI Features", "AI機能を有効化")}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t(
                            "Enable AI-powered features like translation.",
                            "翻訳などのAI機能を有効にします。",
                          )}
                        </p>
                      </div>
                      <Switch
                        checked={aiConfig.enabled}
                        onCheckedChange={(checked) =>
                          handleUpdateAiConfig({ enabled: checked })
                        }
                        disabled={aiSaving}
                      />
                    </div>
                  </div>

                  {/* プロバイダ選択 */}
                  <div className="p-6 bg-muted rounded-lg space-y-4">
                    <div className="space-y-2">
                      <Label>{t("AI Provider", "AIプロバイダ")}</Label>
                      <Select
                        value={aiConfig.provider}
                        onValueChange={(value) =>
                          handleUpdateAiConfig({
                            provider: value as
                              | "openai"
                              | "anthropic"
                              | "local",
                          })
                        }
                        disabled={aiSaving}
                      >
                        <SelectTrigger className="w-full md:w-[300px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">
                            {t("Local LLM", "ローカルLLM")} (
                            {t("Recommended", "推奨")})
                          </SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">
                            Anthropic (Claude)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {aiConfig.provider === "local" &&
                          t(
                            "Uses a local LLM server. No API key required.",
                            "ローカルLLMサーバを使用します。APIキー不要です。",
                          )}
                        {aiConfig.provider === "openai" &&
                          t(
                            "Uses OpenAI GPT models for AI features.",
                            "OpenAI GPTモデルを使用します。",
                          )}
                        {aiConfig.provider === "anthropic" &&
                          t(
                            "Uses Anthropic Claude models for AI features.",
                            "Anthropic Claudeモデルを使用します。",
                          )}
                      </p>
                    </div>

                    {/* ローカルLLM設定 */}
                    {aiConfig.provider === "local" && (
                      <>
                        {/* ローカルプロバイダ選択 */}
                        <div className="space-y-2">
                          <Label>
                            {t("Local LLM Server", "ローカルLLMサーバ")}
                          </Label>
                          <Select
                            value={aiConfig.localProvider}
                            onValueChange={(value) => {
                              const provider = value as
                                | "llama.cpp"
                                | "lm-studio"
                                | "ollama";
                              const defaults = localLLMDefaults?.[provider];
                              handleUpdateAiConfig({
                                localProvider: provider,
                                localEndpoint: defaults?.endpoint || "",
                                localModel: defaults?.model || "",
                              });
                            }}
                            disabled={aiSaving}
                          >
                            <SelectTrigger className="w-full md:w-[300px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="llama.cpp">
                                llama.cpp ({t("Default", "デフォルト")})
                              </SelectItem>
                              <SelectItem value="lm-studio">
                                LM Studio
                              </SelectItem>
                              <SelectItem value="ollama">Ollama</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* エンドポイントURL */}
                        <div className="space-y-2">
                          <Label>
                            {t("Endpoint URL", "エンドポイントURL")}
                          </Label>
                          <Input
                            value={aiConfig.localEndpoint}
                            onChange={(e) =>
                              handleUpdateAiConfig({
                                localEndpoint: e.target.value,
                              })
                            }
                            placeholder={
                              localLLMDefaults?.[aiConfig.localProvider]
                                ?.endpoint || ""
                            }
                            className="font-mono"
                            disabled={aiSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            {aiConfig.localProvider === "llama.cpp" &&
                              t(
                                "Default: http://localhost:8080/v1/chat/completions",
                                "デフォルト: http://localhost:8080/v1/chat/completions",
                              )}
                            {aiConfig.localProvider === "lm-studio" &&
                              t(
                                "Default: http://localhost:1234/v1/chat/completions",
                                "デフォルト: http://localhost:1234/v1/chat/completions",
                              )}
                            {aiConfig.localProvider === "ollama" &&
                              t(
                                "Default: http://localhost:11434/api/chat",
                                "デフォルト: http://localhost:11434/api/chat",
                              )}
                          </p>
                        </div>

                        {/* モデル名 */}
                        <div className="space-y-2">
                          <Label>{t("Model Name", "モデル名")}</Label>
                          <Input
                            value={aiConfig.localModel}
                            onChange={(e) =>
                              handleUpdateAiConfig({
                                localModel: e.target.value,
                              })
                            }
                            placeholder={
                              localLLMDefaults?.[aiConfig.localProvider]
                                ?.model || "default"
                            }
                            disabled={aiSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            {aiConfig.localProvider === "ollama"
                              ? t(
                                  "e.g., llama3.2, gemma2, mistral",
                                  "例: llama3.2, gemma2, mistral",
                                )
                              : t(
                                  "Leave as 'default' to use the loaded model",
                                  "ロード済みモデルを使用する場合は 'default' のまま",
                                )}
                          </p>
                        </div>

                        {/* 接続テスト */}
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            onClick={handleTestLocalConnection}
                            disabled={testingConnection || aiSaving}
                          >
                            {testingConnection
                              ? t("Testing...", "テスト中...")
                              : t("Test Connection", "接続テスト")}
                          </Button>
                          {connectionTestResult && (
                            <span
                              className={`text-sm ${connectionTestResult.success ? "text-green-600" : "text-red-600"}`}
                            >
                              {connectionTestResult.success ? "✓ " : "✗ "}
                              {connectionTestResult.message}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {/* クラウドAPI設定 */}
                    {aiConfig.provider !== "local" && (
                      <>
                        {/* モデル選択 */}
                        <div className="space-y-2">
                          <Label>{t("Model", "モデル")}</Label>
                          <Select
                            value={aiConfig.model}
                            onValueChange={(value) =>
                              handleUpdateAiConfig({ model: value })
                            }
                            disabled={aiSaving}
                          >
                            <SelectTrigger className="w-full md:w-[300px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {aiConfig.provider === "openai" && (
                                <>
                                  <SelectItem value="gpt-4o-mini">
                                    GPT-4o mini ({t("Recommended", "推奨")})
                                  </SelectItem>
                                  <SelectItem value="gpt-4o">
                                    GPT-4o
                                  </SelectItem>
                                  <SelectItem value="gpt-4-turbo">
                                    GPT-4 Turbo
                                  </SelectItem>
                                </>
                              )}
                              {aiConfig.provider === "anthropic" && (
                                <>
                                  <SelectItem value="claude-3-haiku-20240307">
                                    Claude 3 Haiku (
                                    {t("Recommended", "推奨")})
                                  </SelectItem>
                                  <SelectItem value="claude-3-5-sonnet-20241022">
                                    Claude 3.5 Sonnet
                                  </SelectItem>
                                  <SelectItem value="claude-3-opus-20240229">
                                    Claude 3 Opus
                                  </SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* APIキー */}
                        <div className="space-y-2">
                          <Label>{t("API Key", "APIキー")}</Label>
                          {aiConfig.hasApiKey ? (
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <Input
                                  value={aiConfig.apiKey || ""}
                                  disabled
                                  className="font-mono"
                                />
                              </div>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  handleUpdateAiConfig({ apiKey: "" })
                                }
                                disabled={aiSaving}
                              >
                                {t("Remove", "削除")}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <Input
                                  type="password"
                                  value={aiApiKeyInput}
                                  onChange={(e) =>
                                    setAiApiKeyInput(e.target.value)
                                  }
                                  placeholder={
                                    aiConfig.provider === "openai"
                                      ? "sk-..."
                                      : aiConfig.provider === "anthropic"
                                        ? "sk-ant-..."
                                        : ""
                                  }
                                  className="font-mono"
                                />
                              </div>
                              <Button
                                onClick={() =>
                                  handleUpdateAiConfig({
                                    apiKey: aiApiKeyInput,
                                  })
                                }
                                disabled={aiSaving || !aiApiKeyInput}
                              >
                                {aiSaving
                                  ? t("Saving...", "保存中...")
                                  : t("Save", "保存")}
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {aiConfig.provider === "openai" && (
                              <>
                                {t("Get your API key from ", "APIキーは ")}
                                <a
                                  href="https://platform.openai.com/api-keys"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  OpenAI Platform
                                </a>
                                {t(
                                  " to use AI features.",
                                  " から取得できます。",
                                )}
                              </>
                            )}
                            {aiConfig.provider === "anthropic" && (
                              <>
                                {t("Get your API key from ", "APIキーは ")}
                                <a
                                  href="https://console.anthropic.com/settings/keys"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  Anthropic Console
                                </a>
                                {t(
                                  " to use AI features.",
                                  " から取得できます。",
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ステータス */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          aiConfig.enabled &&
                          (
                            aiConfig.provider === "local"
                              ? !!aiConfig.localEndpoint
                              : aiConfig.hasApiKey
                          )
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <span className="font-medium">
                        {aiConfig.enabled &&
                        (aiConfig.provider === "local"
                          ? !!aiConfig.localEndpoint
                          : aiConfig.hasApiKey)
                          ? t(
                              "AI features are ready to use",
                              "AI機能が利用可能です",
                            )
                          : !aiConfig.enabled
                            ? t(
                                "AI features are disabled",
                                "AI機能が無効です",
                              )
                            : aiConfig.provider === "local"
                              ? t(
                                  "Endpoint is not configured",
                                  "エンドポイントが設定されていません",
                                )
                              : t(
                                  "API key is not configured",
                                  "APIキーが設定されていません",
                                )}
                      </span>
                    </div>
                  </div>

                  {/* チュートリアルドキュメント */}
                  <div className="p-6 bg-muted rounded-lg">
                    <TutorialDocumentsManager language={language} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
