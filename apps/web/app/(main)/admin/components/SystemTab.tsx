"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DependencyHealthSection } from "./DependencyHealthSection";
import { ModuleHealthOverview } from "./ModuleHealthOverview";

interface SystemTabProps {
  language: "en" | "ja";
}

export function SystemTab({ language }: SystemTabProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // システムバージョン
  const [systemVersions, setSystemVersions] = useState<Record<string, string> | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(true);

  // アコーディオン開閉
  const [depHealthOpen, setDepHealthOpen] = useState(false);

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
    fetchSystemVersions();
  }, [fetchSystemVersions]);

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
