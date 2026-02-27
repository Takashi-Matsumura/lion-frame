import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/summary
 * ダッシュボード統計情報を返す（ADMIN only）
 */
export const GET = apiHandler(async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const now = new Date();

  // 並列でクエリを実行
  const [
    totalUsers,
    adminCount,
    managerCount,
    userCount,
    guestCount,
    inactiveUsers,
    totalEmployees,
    activeEmployees,
    allEmployeeEmails,
    allUserEmails,
    totalAnnouncements,
    activeAnnouncements,
    expiredAnnouncements,
    lastDiagnosticLogs,
    recentAuditLogs,
  ] = await Promise.all([
    // Users
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "MANAGER" } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "GUEST" } }),
    prisma.user.count({
      where: {
        OR: [
          { lastSignInAt: null },
          { lastSignInAt: { lt: sevenDaysAgo } },
        ],
      },
    }),
    // Employees
    prisma.employee.count(),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { email: true },
    }),
    prisma.user.findMany({
      select: { email: true },
    }),
    // Announcements
    prisma.announcement.count(),
    prisma.announcement.count({
      where: {
        isActive: true,
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gt: now } }],
      },
    }),
    prisma.announcement.count({
      where: {
        endAt: { lte: now },
      },
    }),
    // Last diagnostic: 最新のSYSTEM_DIAGNOSTICエントリ群を取得
    prisma.auditLog.findMany({
      where: { action: "SYSTEM_DIAGNOSTIC" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { createdAt: true, details: true },
    }),
    // Recent audit logs (直近8件)
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        category: true,
        createdAt: true,
        details: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  // 未アカウント社員数を算出: 社員メールとユーザメールを突合
  const userEmailSet = new Set(
    allUserEmails.map((u) => u.email?.toLowerCase()).filter(Boolean),
  );
  const withoutUser = allEmployeeEmails.filter(
    (e) => !e.email || !userEmailSet.has(e.email.toLowerCase()),
  ).length;

  // 最新の診断バッチのタイムスタンプと集計を算出
  let lastDiagnostic: {
    timestamp: string;
    summary: { total: number; pass: number; fail: number; warn: number };
  } | null = null;

  if (lastDiagnosticLogs.length > 0) {
    // 最新のタイムスタンプ（最初のエントリ）
    const latestTimestamp = lastDiagnosticLogs[0].createdAt;
    // 同じバッチ（1秒以内）の診断ログを収集
    const batchCutoff = new Date(latestTimestamp.getTime() - 1000);
    const batchLogs = lastDiagnosticLogs.filter(
      (log) => log.createdAt >= batchCutoff,
    );

    let pass = 0;
    let fail = 0;
    let warn = 0;
    for (const log of batchLogs) {
      try {
        const details = typeof log.details === "string"
          ? JSON.parse(log.details)
          : log.details;
        if (details?.status === "pass") pass++;
        else if (details?.status === "fail") fail++;
        else if (details?.status === "warn") warn++;
      } catch {
        // skip
      }
    }

    lastDiagnostic = {
      timestamp: latestTimestamp.toISOString(),
      summary: { total: batchLogs.length, pass, fail, warn },
    };
  }

  return {
    users: {
      total: totalUsers,
      admins: adminCount,
      managers: managerCount,
      regularUsers: userCount,
      guests: guestCount,
      inactive7Days: inactiveUsers,
    },
    employees: {
      total: totalEmployees,
      active: activeEmployees,
      withoutUser,
    },
    announcements: {
      total: totalAnnouncements,
      active: activeAnnouncements,
      expired: expiredAnnouncements,
    },
    lastDiagnostic,
    recentAuditLogs,
  };
}, { admin: true });
