import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * パスを集計用メトリクス名に変換
 */
function pathToMetric(path: string): string {
  if (path === "/dashboard") return "feature_dashboard";
  if (path === "/organization-chart" || path === "/org-chart")
    return "feature_org_chart";
  if (path === "/ai-chat") return "feature_ai_chat";
  if (path === "/calendar") return "feature_calendar";
  if (path === "/admin" || path.startsWith("/admin"))
    return "feature_admin";
  if (path.startsWith("/manager/")) return "feature_manager";
  if (path.startsWith("/executive/")) return "feature_executive";
  if (path.startsWith("/backoffice/")) return "feature_backoffice";
  return `feature_other`;
}

/**
 * POST /api/admin/usage-stats/aggregate
 * 前日分の日次集計を実行し UsageStat に保存（ADMIN only）
 * ダッシュボード表示時に自動トリガーされる
 */
export const POST = apiHandler(async () => {
  // 集計対象日 = 前日
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const dayEnd = new Date(yesterday);
  dayEnd.setHours(23, 59, 59, 999);

  // 既に集計済みか確認
  const existing = await prisma.usageStat.findFirst({
    where: { date: yesterday, metric: "dau" },
  });
  if (existing) {
    return { status: "already_aggregated", date: yesterday.toISOString().slice(0, 10) };
  }

  // 並列でデータ取得
  const [loginLogs, usageLogs, aiChatLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        action: "LOGIN_SUCCESS",
        createdAt: { gte: yesterday, lte: dayEnd },
      },
      select: { userId: true },
    }),
    prisma.usageLog.findMany({
      where: {
        createdAt: { gte: yesterday, lte: dayEnd },
      },
      select: { userId: true, path: true },
    }),
    prisma.auditLog.findMany({
      where: {
        action: "AI_CHAT_MESSAGE",
        createdAt: { gte: yesterday, lte: dayEnd },
      },
      select: { userId: true },
    }),
  ]);

  // DAU: ユニークログインユーザ数
  const dauUsers = new Set(loginLogs.map((l) => l.userId).filter(Boolean));

  // 機能別アクセス数
  const featureCountMap = new Map<string, number>();
  for (const log of usageLogs) {
    const metric = pathToMetric(log.path);
    featureCountMap.set(metric, (featureCountMap.get(metric) ?? 0) + 1);
  }

  // AIチャット
  const aiChatUsers = new Set(aiChatLogs.map((l) => l.userId).filter(Boolean));

  // UsageStat に一括書き込み
  const stats: { date: Date; metric: string; value: number }[] = [
    { date: yesterday, metric: "dau", value: dauUsers.size },
    { date: yesterday, metric: "ai_chat_messages", value: aiChatLogs.length },
    { date: yesterday, metric: "ai_chat_users", value: aiChatUsers.size },
  ];

  for (const [metric, count] of featureCountMap) {
    stats.push({ date: yesterday, metric, value: count });
  }

  // upsertで書き込み（同時実行セーフ）
  const results = await Promise.all(
    stats.map((stat) =>
      prisma.usageStat.upsert({
        where: { date_metric: { date: stat.date, metric: stat.metric } },
        create: stat,
        update: { value: stat.value },
      }),
    ),
  );

  return {
    status: "aggregated",
    date: yesterday.toISOString().slice(0, 10),
    metricsCount: results.length,
  };
}, { admin: true });
