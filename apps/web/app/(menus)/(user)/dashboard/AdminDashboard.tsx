"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RiAlertLine,
  RiArrowRightLine,
  RiBarChartLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDatabase2Line,
  RiErrorWarningLine,
  RiFileUploadLine,
  RiMegaphoneLine,
  RiMessage3Line,
  RiPlayCircleLine,
  RiPulseLine,
  RiShieldUserLine,
  RiTeamLine,
  RiTimeLine,
  RiUserAddLine,
  RiUserUnfollowLine,
} from "react-icons/ri";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDashboardTranslations } from "./translations";

interface AdminDashboardProps {
  language: "en" | "ja";
}

interface SummaryData {
  users: {
    total: number;
    admins: number;
    managers: number;
    regularUsers: number;
    guests: number;
    inactive7Days: number;
  };
  employees: {
    total: number;
    active: number;
    withoutUser: number;
  };
  announcements: {
    total: number;
    active: number;
    expired: number;
  };
  lastDiagnostic: {
    timestamp: string;
    summary: { total: number; pass: number; fail: number; warn: number };
  } | null;
  recentAuditLogs: {
    id: string;
    action: string;
    category: string;
    createdAt: string;
    details: string | null;
    user: { name: string | null; email: string | null } | null;
  }[];
}

interface DiagnosticResult {
  id: string;
  name: string;
  nameJa: string;
  status: "pass" | "fail" | "warn";
  message: string;
  messageJa: string;
  durationMs: number;
}

interface DiagnosticResponse {
  results: DiagnosticResult[];
  summary: { total: number; pass: number; fail: number; warn: number };
  timestamp: string;
}

interface UsageStatsData {
  period: { start: string; end: string };
  login: {
    dau: { date: string; count: number }[];
    wau: number;
    mau: number;
    dauMauRatio: number;
    peakHours: { hour: number; count: number }[];
  };
  features: {
    name: string;
    nameJa: string;
    path: string;
    accessCount: number;
    uniqueUsers: number;
  }[];
  departments: {
    name: string;
    totalEmployees: number;
    loggedInUsers: number;
    adoptionRate: number;
  }[];
  aiChat: {
    totalMessages: number;
    uniqueUsers: number;
    dailyTrend: { date: string; count: number }[];
  };
}

export function AdminDashboard({ language }: AdminDashboardProps) {
  const t = adminDashboardTranslations[language];
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[] | null>(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const autoRunRef = useRef(false);
  const [usageStats, setUsageStats] = useState<UsageStatsData | null>(null);
  const [usagePeriod, setUsagePeriod] = useState<"7d" | "30d" | "90d">("30d");
  const usageAutoRunRef = useRef(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/summary");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        return json as SummaryData;
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  const runDiagnostics = useCallback(async () => {
    setDiagRunning(true);
    try {
      const res = await fetch("/api/admin/diagnostics", { method: "POST" });
      if (res.ok) {
        const json: DiagnosticResponse = await res.json();
        setDiagnosticResults(json.results);
        // サマリーを再取得して最新の診断タイムスタンプを反映
        await fetchSummary();
      }
    } catch {
      // ignore
    } finally {
      setDiagRunning(false);
    }
  }, [fetchSummary]);

  const fetchUsageStats = useCallback(async (period: string) => {
    try {
      const res = await fetch(`/api/admin/usage-stats?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setUsageStats(json);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSummary().then((summaryData) => {
      if (!summaryData || autoRunRef.current) return;
      // 自動ヘルスチェック: 最終実行が1時間以上前（または未実行）なら自動実行
      const ONE_HOUR = 60 * 60 * 1000;
      const lastTs = summaryData.lastDiagnostic?.timestamp;
      const shouldAutoRun = !lastTs || (Date.now() - new Date(lastTs).getTime()) > ONE_HOUR;
      if (shouldAutoRun) {
        autoRunRef.current = true;
        // バックグラウンドで診断実行
        setDiagRunning(true);
        fetch("/api/admin/diagnostics", { method: "POST" })
          .then(async (res) => {
            if (res.ok) {
              const json: DiagnosticResponse = await res.json();
              setDiagnosticResults(json.results);
              await fetchSummary();
            }
          })
          .catch(() => {})
          .finally(() => setDiagRunning(false));
      }
    });
  }, [fetchSummary]);

  // 利用統計の取得 + 自動集計 & 週次レポート
  useEffect(() => {
    fetchUsageStats(usagePeriod);
  }, [usagePeriod, fetchUsageStats]);

  useEffect(() => {
    if (usageAutoRunRef.current) return;
    usageAutoRunRef.current = true;
    // 日次集計をバックグラウンドで自動実行
    fetch("/api/admin/usage-stats/aggregate", { method: "POST" }).catch(() => {});
    // 週次レポートをバックグラウンドで自動実行
    fetch("/api/admin/usage-stats/report", { method: "POST" }).catch(() => {});
  }, []);

  if (loading && !data) {
    return <AdminDashboardSkeleton />;
  }

  const users = data?.users;
  const employees = data?.employees;
  const announcements = data?.announcements;
  const lastDiag = data?.lastDiagnostic;

  // システム状態を判定
  const healthStatus = lastDiag
    ? lastDiag.summary.fail > 0
      ? "fail"
      : lastDiag.summary.warn > 0
        ? "warn"
        : "pass"
    : "unknown";

  const healthLabel = healthStatus === "pass"
    ? t.allPassed
    : healthStatus === "fail"
      ? `${lastDiag?.summary.fail}${t.failCount}`
      : healthStatus === "warn"
        ? `${lastDiag?.summary.warn}${t.warnCount}`
        : t.neverRun;

  const healthColor = healthStatus === "pass"
    ? "text-green-600 dark:text-green-400"
    : healthStatus === "fail"
      ? "text-red-600 dark:text-red-400"
      : healthStatus === "warn"
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-muted-foreground";

  const kpiItems = [
    {
      icon: RiTeamLine,
      label: t.totalUsers,
      value: users?.total ?? 0,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/50",
    },
    {
      icon: RiShieldUserLine,
      label: t.activeEmployees,
      value: employees?.active ?? 0,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/50",
    },
    {
      icon: RiUserUnfollowLine,
      label: t.unlinkedEmployees,
      value: employees?.withoutUser ?? 0,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/50",
      desc: t.unlinkedEmployeesDesc,
    },
    {
      icon: RiTimeLine,
      label: t.inactiveUsers,
      value: users?.inactive7Days ?? 0,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/50",
      desc: t.inactiveUsersDesc,
    },
    {
      icon: RiMegaphoneLine,
      label: t.expiredAnnouncements,
      value: announcements?.expired ?? 0,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-100 dark:bg-rose-900/50",
    },
    {
      icon: RiPulseLine,
      label: t.systemHealth,
      value: healthLabel,
      color: healthColor,
      bg: healthStatus === "pass"
        ? "bg-green-100 dark:bg-green-900/50"
        : healthStatus === "fail"
          ? "bg-red-100 dark:bg-red-900/50"
          : healthStatus === "warn"
            ? "bg-yellow-100 dark:bg-yellow-900/50"
            : "bg-muted",
    },
  ];

  // 最終実行時刻のフォーマット
  const lastRunLabel = lastDiag
    ? `${t.lastRun}: ${new Date(lastDiag.timestamp).toLocaleString(language === "ja" ? "ja-JP" : "en-US")}`
    : t.neverRun;

  // 使用する診断結果（直接実行した結果 or サマリーから）
  const diagResults = diagnosticResults;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiItems.map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`p-2.5 rounded-lg ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-tight">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.quickActions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 justify-start gap-2"
              onClick={() => router.push("/admin?tab=users")}
            >
              <RiUserAddLine className="w-4 h-4 shrink-0" />
              <span className="text-sm truncate">{t.createAccount}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 justify-start gap-2"
              onClick={() => router.push("/admin?tab=announcements")}
            >
              <RiMegaphoneLine className="w-4 h-4 shrink-0" />
              <span className="text-sm truncate">{t.newAnnouncement}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 justify-start gap-2"
              onClick={() => router.push("/admin/data-management")}
            >
              <RiFileUploadLine className="w-4 h-4 shrink-0" />
              <span className="text-sm truncate">{t.dataImport}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 justify-start gap-2"
              disabled={diagRunning}
              onClick={runDiagnostics}
            >
              <RiPlayCircleLine className="w-4 h-4 shrink-0" />
              <span className="text-sm truncate">
                {diagRunning ? t.running : t.runDiagnostics}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two column: System Health + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.systemHealthTitle}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {lastRunLabel}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {diagRunning && !diagResults ? (
              <p className="text-sm text-muted-foreground">{t.autoRunning}</p>
            ) : diagResults ? (
              <div className="space-y-2">
                {diagResults.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {r.status === "pass" ? (
                        <RiCheckboxCircleLine className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      ) : r.status === "fail" ? (
                        <RiCloseCircleLine className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                      ) : (
                        <RiErrorWarningLine className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      )}
                      <span className="text-sm truncate">
                        {language === "ja" ? r.nameJa : r.name}
                      </span>
                    </div>
                    <Badge
                      variant={r.status === "pass" ? "default" : r.status === "fail" ? "destructive" : "secondary"}
                      className="shrink-0 ml-2"
                    >
                      {t[r.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : lastDiag ? (
              <div className="text-center py-4">
                <p className={`text-sm font-medium ${healthColor}`}>
                  {healthLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lastDiag.summary.total} {language === "ja" ? "項目チェック済み" : "checks completed"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={runDiagnostics}
                  disabled={diagRunning}
                >
                  {t.runDiagnostics}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <RiAlertLine className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t.neverRun}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.recentActivity}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => router.push("/admin/audit-logs")}
              >
                {t.viewAll}
                <RiArrowRightLine className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data?.recentAuditLogs && data.recentAuditLogs.length > 0 ? (
              <div className="space-y-1">
                {data.recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 py-2 border-b last:border-b-0"
                  >
                    <ActivityIcon action={log.action} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {log.action}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.user?.name || log.user?.email || "System"}
                        {" · "}
                        {new Date(log.createdAt).toLocaleString(
                          language === "ja" ? "ja-JP" : "en-US",
                          { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.noActivity}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Statistics Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <RiBarChartLine className="w-5 h-5" />
              {t.usageStats}
            </CardTitle>
            <div className="flex gap-1">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <Button
                  key={p}
                  variant={usagePeriod === p ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2 h-7"
                  onClick={() => setUsagePeriod(p)}
                >
                  {t[`period${p}` as const]}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usageStats ? (
            <div className="space-y-6">
              {/* Login Trend Sparkline + KPIs */}
              <div>
                <h4 className="text-sm font-medium mb-3">{t.loginTrend}</h4>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {usageStats.login.wau}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.wau}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {usageStats.login.mau}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.mau}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {usageStats.login.dauMauRatio}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.dauMauRatio}</p>
                  </div>
                </div>
                <DauSparkline data={usageStats.login.dau} />
              </div>

              {/* Feature Ranking + Department Adoption */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Feature Usage Ranking */}
                <div>
                  <h4 className="text-sm font-medium mb-3">{t.featureRanking}</h4>
                  {usageStats.features.length > 0 ? (
                    <div className="space-y-2">
                      {usageStats.features.slice(0, 8).map((f) => {
                        const maxAccess = usageStats.features[0]?.accessCount || 1;
                        const widthPct = Math.max(
                          (f.accessCount / maxAccess) * 100,
                          4,
                        );
                        return (
                          <div key={f.path}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="truncate">
                                {language === "ja" ? f.nameJa : f.name}
                              </span>
                              <span className="text-muted-foreground shrink-0 ml-2">
                                {f.accessCount} {t.accessCount} · {f.uniqueUsers} {t.uniqueUsersLabel}
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t.noUsageData}</p>
                  )}
                </div>

                {/* Department Adoption */}
                <div>
                  <h4 className="text-sm font-medium mb-3">{t.departmentAdoption}</h4>
                  {usageStats.departments.length > 0 ? (
                    <div className="space-y-2">
                      {usageStats.departments.map((d, i) => (
                        <div key={`${d.name}-${i}`}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="truncate">{d.name}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {d.loggedInUsers}/{d.totalEmployees}{t.people} ({d.adoptionRate}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                d.adoptionRate >= 70
                                  ? "bg-green-500 dark:bg-green-400"
                                  : d.adoptionRate >= 40
                                    ? "bg-yellow-500 dark:bg-yellow-400"
                                    : "bg-red-500 dark:bg-red-400"
                              }`}
                              style={{ width: `${Math.max(d.adoptionRate, 4)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t.noUsageData}</p>
                  )}
                </div>
              </div>

              {/* AI Chat Usage */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <RiMessage3Line className="w-4 h-4" />
                  {t.aiChatUsage}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-2xl font-bold">{usageStats.aiChat.totalMessages}</p>
                      <p className="text-xs text-muted-foreground">{t.totalMessages}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-2xl font-bold">{usageStats.aiChat.uniqueUsers}</p>
                      <p className="text-xs text-muted-foreground">{t.uniqueUsers}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-8 w-12 mx-auto mb-1" />
                    <Skeleton className="h-3 w-10 mx-auto" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * SVGスパークライン: DAU推移を描画
 */
function DauSparkline({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return null;

  const width = 600;
  const height = 60;
  const padding = 2;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const stepX = (width - padding * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: padding + i * stepX,
    y: height - padding - ((d.count / maxCount) * (height - padding * 2)),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // 塗りつぶし用のパス
  const fillD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-16"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#sparkFill)" />
      <path
        d={pathD}
        fill="none"
        stroke="rgb(59, 130, 246)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ActivityIcon({ action }: { action: string }) {
  const base = "w-4 h-4 mt-0.5 shrink-0";
  if (action.includes("LOGIN")) {
    return <RiShieldUserLine className={`${base} text-blue-500`} />;
  }
  if (action.includes("CREATE") || action.includes("IMPORT")) {
    return <RiUserAddLine className={`${base} text-green-500`} />;
  }
  if (action.includes("DELETE") || action.includes("CLEAR")) {
    return <RiCloseCircleLine className={`${base} text-red-500`} />;
  }
  if (action.includes("DIAGNOSTIC")) {
    return <RiPulseLine className={`${base} text-purple-500`} />;
  }
  if (action.includes("ANNOUNCEMENT")) {
    return <RiMegaphoneLine className={`${base} text-orange-500`} />;
  }
  return <RiDatabase2Line className={`${base} text-muted-foreground`} />;
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5 flex flex-col items-center">
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two column: Health + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Skeleton className="h-4 w-4 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-full" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
