"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DependencyHealthSection } from "./DependencyHealthSection";
import { ModuleHealthOverview } from "./ModuleHealthOverview";

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

  // システムバージョン
  const [systemVersions, setSystemVersions] = useState<Record<string, string> | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(true);

  // アコーディオン開閉
  const [authSettingsOpen, setAuthSettingsOpen] = useState(false);
  const [depHealthOpen, setDepHealthOpen] = useState(false);

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

  const handleGoogleOAuthToggle = useCallback(async (enabled: boolean) => {
    setGoogleOAuthLoading(true);
    try {
      const response = await fetch("/api/admin/google-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) setGoogleOAuthEnabled(enabled);
    } catch (error) {
      console.error("Error updating Google OAuth setting:", error);
    } finally {
      setGoogleOAuthLoading(false);
    }
  }, []);

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

  const handleGitHubOAuthToggle = useCallback(async (enabled: boolean) => {
    setGitHubOAuthLoading(true);
    try {
      const response = await fetch("/api/admin/github-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) setGitHubOAuthEnabled(enabled);
    } catch (error) {
      console.error("Error updating GitHub OAuth setting:", error);
    } finally {
      setGitHubOAuthLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchGoogleOAuthSetting();
    fetchGitHubOAuthSetting();
    fetchSystemVersions();
  }, [fetchGoogleOAuthSetting, fetchGitHubOAuthSetting, fetchSystemVersions]);

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
                {[
                  ["Framework", "フレームワーク", systemVersions?.framework ?? "Next.js (App Router)"],
                  ["Runtime", "ランタイム", systemVersions?.runtime ?? "React"],
                  ["Database", "データベース", systemVersions?.database ?? "PostgreSQL (Prisma ORM)"],
                  ["Authentication", "認証", systemVersions?.auth ?? "Auth.js (NextAuth.js v5)"],
                  ["Styling", "スタイリング", systemVersions?.styling ?? "Tailwind CSS"],
                  ["Language", "言語", systemVersions?.language ?? "TypeScript"],
                ].map(([en, ja, value], i, arr) => (
                  <div key={en} className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                    <span className="font-medium">{t(en, ja)}</span>
                    <span className="font-mono text-sm">{value}</span>
                  </div>
                ))}
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
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${depHealthOpen ? "" : "-rotate-90"}`} />
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
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${authSettingsOpen ? "" : "-rotate-90"}`} />
            <h2 className="text-base font-semibold">
              {t("Authentication Settings", "認証設定")}
            </h2>
          </button>
          {authSettingsOpen && (
            <div className="space-y-4 mt-4">
              <div className="p-6 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Google OAuth</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("Enable Google OAuth login on the login page", "ログイン画面でGoogle OAuthログインを有効にする")}
                    </p>
                  </div>
                  <Switch checked={googleOAuthEnabled} onCheckedChange={handleGoogleOAuthToggle} disabled={googleOAuthLoading} />
                </div>
                {!googleOAuthEnabled && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                    {t("To enable Google OAuth, configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment variables.", "Google OAuthを有効にするには、環境変数にGOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを設定してください。")}
                  </p>
                )}
              </div>
              <div className="p-6 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">GitHub OAuth</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("Enable GitHub OAuth login on the login page", "ログイン画面でGitHub OAuthログインを有効にする")}
                    </p>
                  </div>
                  <Switch checked={gitHubOAuthEnabled} onCheckedChange={handleGitHubOAuthToggle} disabled={gitHubOAuthLoading} />
                </div>
                {!gitHubOAuthEnabled && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                    {t("To enable GitHub OAuth, configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the environment variables.", "GitHub OAuthを有効にするには、環境変数にGITHUB_CLIENT_IDとGITHUB_CLIENT_SECRETを設定してください。")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI設定（専用メニューに移動） */}
        <div className="mt-8">
          <h2 className="text-base font-semibold mb-3">
            {t("AI Settings", "AI設定")}
          </h2>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {t(
                "AI settings have been moved to the dedicated AI Settings menu.",
                "AI設定は管理者メニューの「AI設定」に移動しました。",
              )}
            </p>
            <a href="/admin/ai-settings" className="text-sm text-primary hover:underline mt-2 inline-block">
              {t("Go to AI Settings →", "AI設定を開く →")}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
