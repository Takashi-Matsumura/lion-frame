"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  OctagonX,
  RefreshCw,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ModuleHealthCheckResponse,
  ModuleImpact,
} from "@/types/admin";

interface ModuleHealthOverviewProps {
  language: "en" | "ja";
}

const HEALTH_PREFILL_KEY = "module-health-announcement-prefill";

export function ModuleHealthOverview({ language }: ModuleHealthOverviewProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);
  const router = useRouter();

  const [data, setData] = useState<ModuleHealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/modules/health");
      if (!res.ok) throw new Error("Health check failed");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(
        t("Health check failed", "ヘルスチェックに失敗しました"),
      );
    } finally {
      setLoading(false);
    }
  }, [language]);

  const handleCreateAnnouncement = useCallback(
    (impact: ModuleImpact) => {
      // sessionStorage にプリフィルデータを保存
      const prefillData = {
        templateId: "module-disruption",
        placeholderValues: {
          moduleName: impact.sourceModuleNameJa,
          status:
            impact.sourceStatus === "stopped"
              ? t("stopped", "停止中")
              : t("degraded", "機能低下中"),
          affectedFeatures: impact.affectedMenus
            .map((m) => m.nameJa)
            .join("、"),
          additionalInfo: "",
        },
      };
      sessionStorage.setItem(HEALTH_PREFILL_KEY, JSON.stringify(prefillData));
      // アナウンスタブへ遷移
      router.push("/admin?tab=announcements");
    },
    [router, language],
  );

  // 未実行状態
  if (!data && !loading && !error) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>{t("Module health check not yet run", "モジュールヘルスチェック未実行")}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runHealthCheck}
          disabled={loading}
        >
          <Activity className="mr-1.5 h-3.5 w-3.5" />
          {t("Run Health Check", "ヘルスチェック実行")}
        </Button>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <span className="text-sm text-destructive">{error}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={runHealthCheck}
          disabled={loading}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("Retry", "再試行")}
        </Button>
      </div>
    );
  }

  // ローディング
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 px-4 py-4">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t("Running health check...", "ヘルスチェック実行中...")}
        </span>
      </div>
    );
  }

  if (!data) return null;

  const { summary, impacts } = data;
  const allHealthy = summary.degraded === 0 && summary.stopped === 0;

  return (
    <div className="space-y-3">
      {/* サマリーバー */}
      <div
        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
          allHealthy
            ? "border-green-200 bg-green-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            {summary.healthy} {t("Healthy", "正常")}
          </span>
          {summary.degraded > 0 && (
            <span className="flex items-center gap-1.5 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {summary.degraded} {t("Degraded", "低下")}
            </span>
          )}
          {summary.stopped > 0 && (
            <span className="flex items-center gap-1.5 text-red-700">
              <OctagonX className="h-4 w-4" />
              {summary.stopped} {t("Stopped", "停止")}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            ({data.totalDurationMs}ms)
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runHealthCheck}
          disabled={loading}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("Re-check", "再チェック")}
        </Button>
      </div>

      {/* 非正常モジュールの影響カード */}
      {impacts.map((impact) => (
        <Card
          key={impact.sourceModuleId}
          className={`border-l-4 ${
            impact.sourceStatus === "stopped"
              ? "border-l-red-500"
              : "border-l-amber-500"
          }`}
        >
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {/* ヘッダー */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      impact.sourceStatus === "stopped"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }
                  >
                    {impact.sourceStatus === "stopped"
                      ? t("Stopped", "停止")
                      : t("Degraded", "低下")}
                  </Badge>
                  <span className="font-medium">
                    {impact.sourceModuleNameJa}
                  </span>
                </div>

                {/* 理由 */}
                <p className="text-sm text-muted-foreground">
                  {data.modules.find((m) => m.moduleId === impact.sourceModuleId)?.reasonJa}
                </p>

                {/* 影響メニュー */}
                {impact.affectedMenus.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {t("Affected menus:", "影響メニュー:")}
                    </span>
                    {impact.affectedMenus.map((menu) => (
                      <Badge
                        key={menu.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        {menu.nameJa}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 影響モジュール */}
                {impact.affectedModules.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {t("Affected modules:", "影響モジュール:")}
                    </span>
                    {impact.affectedModules.map((mod) => (
                      <Badge
                        key={mod.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        {mod.nameJa}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* アナウンス作成ボタン */}
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => handleCreateAnnouncement(impact)}
              >
                <Megaphone className="mr-1.5 h-3.5 w-3.5" />
                {t("Create Announcement", "アナウンス作成")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
