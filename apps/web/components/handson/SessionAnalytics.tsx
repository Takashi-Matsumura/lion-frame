"use client";

import { useState, useEffect } from "react";

const translations = {
  en: {
    loading: "Loading analytics...",
    error: "Failed to load analytics",
    participants: "Participants",
    duration: "Duration",
    avgCompletion: "Avg Completion",
    totalErrors: "Errors",
    helpRequests: "Help Requests",
    minutes: "min",
    participantTable: "Participant Progress",
    seat: "Seat",
    name: "Name",
    ok: "OK",
    errors: "Errors",
    help: "Help",
    completion: "Completion",
    errorHotspots: "Error Hotspots",
    command: "Command",
    errorCount: "Errors",
    okCount: "OK",
    helpBySection: "Help Requests by Section",
    section: "Section",
    count: "Count",
    instructorTimeline: "Instructor Timeline",
    noErrors: "No errors recorded",
    noHelp: "No help requests recorded",
    noTimeline: "No instructor checkpoints recorded",
    lastActivity: "Last Activity",
  },
  ja: {
    loading: "分析データを読み込み中...",
    error: "分析データの読み込みに失敗しました",
    participants: "参加者",
    duration: "所要時間",
    avgCompletion: "平均完了率",
    totalErrors: "エラー数",
    helpRequests: "ヘルプ数",
    minutes: "分",
    participantTable: "受講者別進捗",
    seat: "座席",
    name: "名前",
    ok: "OK",
    errors: "エラー",
    help: "ヘルプ",
    completion: "完了率",
    errorHotspots: "エラー多発箇所",
    command: "コマンド",
    errorCount: "エラー",
    okCount: "OK",
    helpBySection: "セクション別ヘルプ",
    section: "セクション",
    count: "件",
    instructorTimeline: "講師タイムライン",
    noErrors: "エラーの記録がありません",
    noHelp: "ヘルプリクエストの記録がありません",
    noTimeline: "講師チェックポイントの記録がありません",
    lastActivity: "最終操作",
  },
};

interface AnalyticsData {
  summary: {
    participantCount: number;
    durationMinutes: number;
    avgCompletionRate: number;
    totalCommands: number;
    totalErrors: number;
    totalHelpRequests: number;
  };
  participants: {
    seatNumber: number;
    displayName: string;
    commandsOk: number;
    commandsError: number;
    helpRequests: number;
    lastActivityAt: string | null;
  }[];
  errorHotspots: {
    commandIndex: number;
    errorCount: number;
    okCount: number;
  }[];
  helpBySection: {
    sectionIndex: number;
    count: number;
  }[];
  instructorTimeline: {
    commandIndex: number;
    timestamp: string;
  }[];
}

interface Props {
  language: "en" | "ja";
  sessionId: string;
}

export default function SessionAnalytics({ language, sessionId }: Props) {
  const t = translations[language];
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/handson/sessions/${sessionId}/analytics`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">{t.error}</div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* KPIカード */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard label={t.participants} value={String(summary.participantCount)} color="blue" />
        <KpiCard label={t.duration} value={`${summary.durationMinutes}${t.minutes}`} color="cyan" />
        <KpiCard label={t.avgCompletion} value={`${summary.avgCompletionRate}%`} color="green" />
        <KpiCard label={t.totalErrors} value={String(summary.totalErrors)} color="red" />
        <KpiCard label={t.helpRequests} value={String(summary.totalHelpRequests)} color="amber" />
      </div>

      {/* 受講者テーブル */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t.participantTable}</h3>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t.seat}</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t.name}</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t.ok}</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t.errors}</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t.help}</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t.completion}</th>
              </tr>
            </thead>
            <tbody>
              {data.participants.map((p) => {
                const total = p.commandsOk + p.commandsError;
                const rate = summary.totalCommands > 0
                  ? Math.round((p.commandsOk / summary.totalCommands) * 100)
                  : 0;
                return (
                  <tr key={p.seatNumber} className="border-b">
                    <td className="px-3 py-2 font-semibold text-foreground">{p.seatNumber}</td>
                    <td className="px-3 py-2 text-foreground">{p.displayName}</td>
                    <td className="px-3 py-2 text-center text-green-600 dark:text-green-400">{p.commandsOk}</td>
                    <td className="px-3 py-2 text-center text-red-600 dark:text-red-400">{p.commandsError || "-"}</td>
                    <td className="px-3 py-2 text-center text-amber-600 dark:text-amber-400">{p.helpRequests || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* エラーホットスポット + ヘルプ分布 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* エラーホットスポット */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t.errorHotspots}</h3>
          {data.errorHotspots.length === 0 ? (
            <div className="rounded-lg border bg-card py-6 text-center text-sm text-muted-foreground">
              {t.noErrors}
            </div>
          ) : (
            <div className="space-y-2">
              {data.errorHotspots.map((h) => {
                const total = h.errorCount + h.okCount;
                const rate = total > 0 ? Math.round((h.errorCount / total) * 100) : 0;
                return (
                  <div key={h.commandIndex} className="flex items-center gap-3">
                    <span className="w-12 text-right font-mono text-xs text-muted-foreground">
                      #{h.commandIndex + 1}
                    </span>
                    <div className="h-5 flex-1 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full rounded bg-red-500"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="w-16 text-xs text-muted-foreground">
                      {h.errorCount}{t.errorCount} / {total}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ヘルプ分布 */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t.helpBySection}</h3>
          {data.helpBySection.length === 0 ? (
            <div className="rounded-lg border bg-card py-6 text-center text-sm text-muted-foreground">
              {t.noHelp}
            </div>
          ) : (
            <div className="space-y-2">
              {data.helpBySection.map((h) => {
                const maxCount = Math.max(...data.helpBySection.map((x) => x.count));
                const rate = maxCount > 0 ? Math.round((h.count / maxCount) * 100) : 0;
                return (
                  <div key={h.sectionIndex} className="flex items-center gap-3">
                    <span className="w-16 text-right text-xs text-muted-foreground">
                      {t.section} {h.sectionIndex + 1}
                    </span>
                    <div className="h-5 flex-1 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full rounded bg-amber-500"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="w-10 text-xs text-muted-foreground">
                      {h.count}{t.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 講師タイムライン */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t.instructorTimeline}</h3>
        {data.instructorTimeline.length === 0 ? (
          <div className="rounded-lg border bg-card py-6 text-center text-sm text-muted-foreground">
            {t.noTimeline}
          </div>
        ) : (
          <div className="relative border-l-2 border-blue-300 pl-6 dark:border-blue-800">
            {data.instructorTimeline.map((item, i) => (
              <div key={i} className="relative mb-4">
                <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-blue-500" />
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    #{item.commandIndex + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleTimeString(language === "ja" ? "ja-JP" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// === KPIカード ===
function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    green: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  };

  return (
    <div className={`rounded-lg p-3 text-center ${colorClasses[color] || colorClasses.blue}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs opacity-80">{label}</div>
    </div>
  );
}
