"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface DependencyItem {
  id: string;
  packageName: string;
  currentVersion: string;
  latestVersion: string | null;
  isOutdated: boolean;
  isDev: boolean;
  hasVulnerability: boolean;
  vulnSeverity: string | null;
  vulnTitle: string | null;
  vulnAdvisoryUrl: string | null;
}

interface ReportSummary {
  total: number;
  outdated: number;
  vulnerable: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface DependencyReport {
  id: string;
  checkedAt: string;
  trigger: string;
  status: string;
  summary: ReportSummary | null;
  errorMessage: string | null;
  durationMs: number | null;
  items: DependencyItem[];
}

interface DependencyHealthSectionProps {
  language: "en" | "ja";
}

export function DependencyHealthSection({
  language,
}: DependencyHealthSectionProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  const [report, setReport] = useState<DependencyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dependency-check");
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch (error) {
      console.error("Failed to fetch dependency report:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleRunCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/dependency-check", {
        method: "POST",
      });
      if (res.ok) {
        // 少し待ってから結果を取得（チェック完了を待つ）
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await fetchReport();
      }
    } catch (error) {
      console.error("Failed to run dependency check:", error);
    } finally {
      setChecking(false);
    }
  };

  const summary = report?.summary;
  const outdatedItems = report?.items.filter((i) => i.isOutdated) ?? [];
  const vulnItems = report?.items.filter((i) => i.hasVulnerability) ?? [];

  const severityColor = (severity: string | null) => {
    switch (severity) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "high":
        return "text-orange-600 dark:text-orange-400";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400";
      case "low":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  const severityBg = (severity: string | null) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "high":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const diffLabel = (current: string, latest: string | null) => {
    if (!latest) return "";
    const [cMaj, cMin] = current.split(".").map(Number);
    const [lMaj, lMin] = latest.split(".").map(Number);
    if (cMaj !== lMaj) return t("Major", "メジャー");
    if (cMin !== lMin) return t("Minor", "マイナー");
    return t("Patch", "パッチ");
  };

  // 初期ロード中
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 px-4 py-4 mt-4">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t("Loading...", "読み込み中...")}
        </span>
      </div>
    );
  }

  // 未実行状態
  if (!report && !checking) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>{t("Dependency check not yet run", "依存関係チェック未実行")}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunCheck}
          disabled={checking}
        >
          <Activity className="mr-1.5 h-3.5 w-3.5" />
          {t("Run Check", "チェック実行")}
        </Button>
      </div>
    );
  }

  // チェック実行中（レポートなし）
  if (checking && !report) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 px-4 py-4 mt-4">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t("Running dependency check...", "依存関係チェック実行中...")}
        </span>
      </div>
    );
  }

  const hasVulnerabilities = summary && (summary.critical > 0 || summary.high > 0);
  const hasOutdated = summary && summary.outdated > 0;
  const barColor = hasVulnerabilities
    ? "border-red-200 bg-red-50"
    : hasOutdated
      ? "border-amber-200 bg-amber-50"
      : "border-green-200 bg-green-50";

  return (
    <div className="space-y-3 mt-4">
      {/* サマリーバー（モジュールヘルスと同一フォーマット） */}
      <div
        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${barColor}`}
      >
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-700">
            <CheckCircle className="h-4 w-4" />
            {summary ? summary.total - summary.outdated - summary.vulnerable : 0} {t("Up to date", "最新")}
          </span>
          {summary && summary.outdated > 0 && (
            <span className="flex items-center gap-1.5 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {summary.outdated} {t("Outdated", "更新あり")}
            </span>
          )}
          {summary && (summary.critical > 0 || summary.high > 0) && (
            <span className="flex items-center gap-1.5 text-red-700">
              <ShieldAlert className="h-4 w-4" />
              {summary.critical + summary.high} {t("Vulnerabilities", "脆弱性")}
            </span>
          )}
          {report?.durationMs != null && (
            <span className="text-muted-foreground text-xs">
              ({(report.durationMs / 1000).toFixed(1)}s)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunCheck}
          disabled={checking}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
          {t("Re-check", "再チェック")}
        </Button>
      </div>

      {/* エラー表示 */}
      {report?.status === "failed" && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            <span className="font-medium">{t("Check failed", "チェック失敗")}</span>
          </div>
          {report.errorMessage && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {report.errorMessage}
            </p>
          )}
        </div>
      )}

      {/* 脆弱性テーブル */}
      {vulnItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-red-700 dark:text-red-400">
            <ShieldAlert className="h-4 w-4" />
            {t("Vulnerabilities", "脆弱性")}
          </h4>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("Package", "パッケージ")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("Severity", "重大度")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("Title", "タイトル")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("Advisory", "アドバイザリ")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vulnItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-mono text-xs">
                      {item.packageName}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${severityBg(item.vulnSeverity)}`}
                      >
                        {item.vulnSeverity?.toUpperCase() ?? "N/A"}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-xs ${severityColor(item.vulnSeverity)}`}
                    >
                      {item.vulnTitle ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {item.vulnAdvisoryUrl ? (
                        <a
                          href={item.vulnAdvisoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {t("View", "表示")}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 更新ありパッケージテーブル */}
      {outdatedItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            {t("Outdated Packages", "更新可能なパッケージ")}
          </h4>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("Package", "パッケージ")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("Current", "現在")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("Latest", "最新")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("Type", "種別")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {outdatedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-mono text-xs">
                      {item.packageName}
                      {item.isDev && (
                        <span className="ml-1 text-muted-foreground">(dev)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {item.currentVersion}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-green-600 dark:text-green-400">
                      {item.latestVersion ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-medium ${
                          diffLabel(item.currentVersion, item.latestVersion) ===
                            t("Major", "メジャー")
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : diffLabel(
                                  item.currentVersion,
                                  item.latestVersion,
                                ) === t("Minor", "マイナー")
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {diffLabel(item.currentVersion, item.latestVersion)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
