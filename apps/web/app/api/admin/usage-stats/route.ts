import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * パスからメニュー名へのマッピング
 */
function getFeatureName(path: string): { en: string; ja: string } | null {
  if (path === "/dashboard") return { en: "Dashboard", ja: "ダッシュボード" };
  if (path === "/organization-chart" || path === "/org-chart")
    return { en: "Organization Chart", ja: "組織図" };
  if (path === "/ai-chat") return { en: "AI Chat", ja: "AIチャット" };
  if (path === "/calendar") return { en: "Calendar", ja: "カレンダー" };
  if (path === "/admin" || path.startsWith("/admin/"))
    return { en: "Admin", ja: "管理機能" };
  if (path.startsWith("/manager/"))
    return { en: "Manager", ja: "マネージャー機能" };
  if (path.startsWith("/executive/"))
    return { en: "Executive", ja: "エグゼクティブ機能" };
  if (path.startsWith("/backoffice/"))
    return { en: "Back Office", ja: "バックオフィス" };
  return null;
}

/**
 * パスを正規化してグルーピングキーを返す
 */
function normalizePathKey(path: string): string {
  if (path === "/dashboard") return "/dashboard";
  if (path === "/organization-chart" || path === "/org-chart")
    return "/organization-chart";
  if (path === "/ai-chat") return "/ai-chat";
  if (path === "/calendar") return "/calendar";
  if (path === "/admin" || path.startsWith("/admin")) return "/admin";
  if (path.startsWith("/manager/")) return "/manager";
  if (path.startsWith("/executive/")) return "/executive";
  if (path.startsWith("/backoffice/")) return "/backoffice";
  return path;
}

/**
 * GET /api/admin/usage-stats?period=7d|30d|90d
 * 利用統計を返す（ADMIN only）
 */
export const GET = apiHandler(async (request) => {
  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period") || "30d";
  const days = periodParam === "7d" ? 7 : periodParam === "90d" ? 90 : 30;

  const now = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 並列でクエリを実行
  const [
    loginLogs,
    usageLogs,
    departments,
    allUserEmails,
    allEmployees,
    aiChatLogs,
  ] = await Promise.all([
    // ログイン成功ログ（期間内）
    prisma.auditLog.findMany({
      where: {
        action: "LOGIN_SUCCESS",
        createdAt: { gte: start },
      },
      select: { userId: true, createdAt: true },
    }),
    // ページアクセスログ（期間内）
    prisma.usageLog.findMany({
      where: { createdAt: { gte: start } },
      select: { userId: true, path: true, createdAt: true },
    }),
    // 部門（社員数付き）
    prisma.department.findMany({
      include: {
        employees: {
          where: { isActive: true },
          select: { email: true },
        },
      },
    }),
    // 全ユーザ（メールとID）
    prisma.user.findMany({
      select: { id: true, email: true },
    }),
    // 全アクティブ社員
    prisma.employee.findMany({
      where: { isActive: true },
      select: { email: true, departmentId: true },
    }),
    // AIチャットメッセージログ
    prisma.auditLog.findMany({
      where: {
        action: "AI_CHAT_MESSAGE",
        createdAt: { gte: start },
      },
      select: { userId: true, createdAt: true },
    }),
  ]);

  // --- ログイン指標 ---
  // 日別DAU（ユニークログインユーザ数）
  const dauMap = new Map<string, Set<string>>();
  for (const log of loginLogs) {
    if (!log.userId) continue;
    const dateKey = log.createdAt.toISOString().slice(0, 10);
    if (!dauMap.has(dateKey)) dauMap.set(dateKey, new Set());
    dauMap.get(dateKey)!.add(log.userId);
  }

  const dau: { date: string; count: number }[] = [];
  const d = new Date(start);
  while (d <= now) {
    const dateKey = d.toISOString().slice(0, 10);
    dau.push({ date: dateKey, count: dauMap.get(dateKey)?.size ?? 0 });
    d.setDate(d.getDate() + 1);
  }

  // WAU / MAU
  const wauUsers = new Set<string>();
  const mauUsers = new Set<string>();
  for (const log of loginLogs) {
    if (!log.userId) continue;
    if (log.createdAt >= sevenDaysAgo) wauUsers.add(log.userId);
    if (log.createdAt >= thirtyDaysAgo) mauUsers.add(log.userId);
  }

  const wau = wauUsers.size;
  const mau = mauUsers.size;
  const dauMauRatio = mau > 0
    ? Math.round((dau.filter((d) => d.date >= thirtyDaysAgo.toISOString().slice(0, 10))
        .reduce((sum, d) => sum + d.count, 0) /
        dau.filter((d) => d.date >= thirtyDaysAgo.toISOString().slice(0, 10)).length /
        mau) * 100) / 100
    : 0;

  // 時間帯別ログイン数
  const hourCounts = new Array(24).fill(0);
  for (const log of loginLogs) {
    hourCounts[log.createdAt.getHours()]++;
  }
  const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

  // --- 機能利用指標 ---
  const featureMap = new Map<string, { accessCount: number; users: Set<string> }>();
  for (const log of usageLogs) {
    const key = normalizePathKey(log.path);
    if (!featureMap.has(key)) featureMap.set(key, { accessCount: 0, users: new Set() });
    const entry = featureMap.get(key)!;
    entry.accessCount++;
    entry.users.add(log.userId);
  }

  const features = Array.from(featureMap.entries())
    .map(([path, data]) => {
      const name = getFeatureName(path);
      return {
        name: name?.en ?? path,
        nameJa: name?.ja ?? path,
        path,
        accessCount: data.accessCount,
        uniqueUsers: data.users.size,
      };
    })
    .sort((a, b) => b.accessCount - a.accessCount);

  // --- 部門別採用率 ---
  // User email → userId マッピング
  const emailToUserId = new Map<string, string>();
  for (const u of allUserEmails) {
    if (u.email) emailToUserId.set(u.email.toLowerCase(), u.id);
  }

  // 直近30日のログインユーザID
  const recentLoginUserIds = new Set<string>();
  for (const log of loginLogs) {
    if (log.userId && log.createdAt >= thirtyDaysAgo) {
      recentLoginUserIds.add(log.userId);
    }
  }

  const departmentStats = departments.map((dept) => {
    const totalEmployees = dept.employees.length;
    let loggedInUsers = 0;
    for (const emp of dept.employees) {
      if (emp.email) {
        const userId = emailToUserId.get(emp.email.toLowerCase());
        if (userId && recentLoginUserIds.has(userId)) {
          loggedInUsers++;
        }
      }
    }
    return {
      name: dept.name,
      totalEmployees,
      loggedInUsers,
      adoptionRate: totalEmployees > 0
        ? Math.round((loggedInUsers / totalEmployees) * 100)
        : 0,
    };
  }).sort((a, b) => b.adoptionRate - a.adoptionRate);

  // --- AIチャット利用 ---
  const aiDailyMap = new Map<string, number>();
  const aiUniqueUsers = new Set<string>();
  for (const log of aiChatLogs) {
    if (log.userId) aiUniqueUsers.add(log.userId);
    const dateKey = log.createdAt.toISOString().slice(0, 10);
    aiDailyMap.set(dateKey, (aiDailyMap.get(dateKey) ?? 0) + 1);
  }

  const aiDailyTrend: { date: string; count: number }[] = [];
  const d2 = new Date(start);
  while (d2 <= now) {
    const dateKey = d2.toISOString().slice(0, 10);
    aiDailyTrend.push({ date: dateKey, count: aiDailyMap.get(dateKey) ?? 0 });
    d2.setDate(d2.getDate() + 1);
  }

  return {
    period: { start: start.toISOString(), end: now.toISOString() },
    login: {
      dau,
      wau,
      mau,
      dauMauRatio,
      peakHours,
    },
    features,
    departments: departmentStats,
    aiChat: {
      totalMessages: aiChatLogs.length,
      uniqueUsers: aiUniqueUsers.size,
      dailyTrend: aiDailyTrend,
    },
  };
}, { admin: true });
