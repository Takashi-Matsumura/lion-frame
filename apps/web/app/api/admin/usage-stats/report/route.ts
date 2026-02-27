import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * POST /api/admin/usage-stats/report
 * 週次利用レポートを生成し ADMIN に通知（ADMIN only）
 * ダッシュボード表示時に「最終レポート送信から7日以上経過」で自動トリガー
 */
export const POST = apiHandler(async () => {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 最終レポート送信日を SystemSetting から取得
  const lastReportSetting = await prisma.systemSetting.findUnique({
    where: { key: "usage_report_last_sent" },
  });

  if (lastReportSetting) {
    const lastSent = new Date(lastReportSetting.value);
    if (now.getTime() - lastSent.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return { status: "skipped", reason: "less_than_7_days" };
    }
  }

  // レポートデータ収集
  const [loginLogs, usageLogs, departments, allUserEmails, aiChatLogs] =
    await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: "LOGIN_SUCCESS",
          createdAt: { gte: sevenDaysAgo },
        },
        select: { userId: true, createdAt: true },
      }),
      prisma.usageLog.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { path: true, userId: true },
      }),
      prisma.department.findMany({
        include: {
          employees: {
            where: { isActive: true },
            select: { email: true },
          },
        },
      }),
      prisma.user.findMany({ select: { id: true, email: true } }),
      prisma.auditLog.findMany({
        where: {
          action: "AI_CHAT_MESSAGE",
          createdAt: { gte: sevenDaysAgo },
        },
        select: { userId: true },
      }),
    ]);

  // WAU
  const wauUsers = new Set(loginLogs.map((l) => l.userId).filter(Boolean));
  const wau = wauUsers.size;

  // MAU (30日ログイン)
  const mauLoginLogs = await prisma.auditLog.findMany({
    where: {
      action: "LOGIN_SUCCESS",
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { userId: true },
  });
  const mauUsers = new Set(mauLoginLogs.map((l) => l.userId).filter(Boolean));
  const mau = mauUsers.size;

  // 最も利用された機能
  const featureCountMap = new Map<string, number>();
  for (const log of usageLogs) {
    const key = log.path;
    featureCountMap.set(key, (featureCountMap.get(key) ?? 0) + 1);
  }
  let topFeature = { path: "-", count: 0 };
  for (const [path, count] of featureCountMap) {
    if (count > topFeature.count) topFeature = { path, count };
  }

  const featureNameMap: Record<string, { en: string; ja: string }> = {
    "/dashboard": { en: "Dashboard", ja: "ダッシュボード" },
    "/organization-chart": { en: "Organization Chart", ja: "組織図" },
    "/org-chart": { en: "Organization Chart", ja: "組織図" },
    "/ai-chat": { en: "AI Chat", ja: "AIチャット" },
    "/calendar": { en: "Calendar", ja: "カレンダー" },
  };
  const topFeatureNameEn =
    featureNameMap[topFeature.path]?.en ?? topFeature.path;
  const topFeatureNameJa =
    featureNameMap[topFeature.path]?.ja ?? topFeature.path;

  // 部門別採用率（最低）
  const emailToUserId = new Map<string, string>();
  for (const u of allUserEmails) {
    if (u.email) emailToUserId.set(u.email.toLowerCase(), u.id);
  }

  let lowestDept = { name: "-", rate: 100 };
  for (const dept of departments) {
    if (dept.employees.length === 0) continue;
    let loggedIn = 0;
    for (const emp of dept.employees) {
      if (emp.email) {
        const uid = emailToUserId.get(emp.email.toLowerCase());
        if (uid && wauUsers.has(uid)) loggedIn++;
      }
    }
    const rate = Math.round((loggedIn / dept.employees.length) * 100);
    if (rate < lowestDept.rate) {
      lowestDept = { name: dept.name, rate };
    }
  }

  // 期間ラベル
  const fmtDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const periodLabel = `${fmtDate(sevenDaysAgo)} - ${fmtDate(now)}`;

  // 通知送信
  await NotificationService.broadcast({
    role: "ADMIN",
    type: "INFO",
    title: `Weekly Usage Report (${periodLabel})`,
    titleJa: `週次利用レポート (${periodLabel})`,
    message: `WAU: ${wau} / MAU: ${mau} / Top feature: ${topFeatureNameEn} / Lowest adoption: ${lowestDept.name} (${lowestDept.rate}%)`,
    messageJa: `WAU: ${wau}名 / MAU: ${mau}名 / 最も利用された機能: ${topFeatureNameJa} / 部門採用率最低: ${lowestDept.name} (${lowestDept.rate}%)`,
    actionUrl: "/dashboard",
    source: "USAGE_REPORT",
  });

  // 最終送信日時を記録
  await prisma.systemSetting.upsert({
    where: { key: "usage_report_last_sent" },
    create: { key: "usage_report_last_sent", value: now.toISOString() },
    update: { value: now.toISOString() },
  });

  return {
    status: "sent",
    period: periodLabel,
    summary: { wau, mau, topFeature: topFeatureNameEn, lowestDept },
  };
}, { admin: true });
