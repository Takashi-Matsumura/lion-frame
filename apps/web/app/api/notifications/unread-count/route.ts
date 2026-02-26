import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/unread-count
 * 未読通知数を取得
 */
export const GET = apiHandler(async (_request, session) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });

  if (!user) {
    throw ApiError.notFound("User not found", "ユーザーが見つかりません");
  }

  const [total, byType] = await Promise.all([
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
    prisma.notification.groupBy({
      by: ["type"],
      where: { userId: user.id, isRead: false },
      _count: { id: true },
    }),
  ]);

  const byTypeMap = byType.reduce(
    (acc, item) => {
      acc[item.type] = item._count.id;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    count: total,
    byType: {
      SYSTEM: byTypeMap.SYSTEM || 0,
      SECURITY: byTypeMap.SECURITY || 0,
      ACTION: byTypeMap.ACTION || 0,
      INFO: byTypeMap.INFO || 0,
      WARNING: byTypeMap.WARNING || 0,
      ERROR: byTypeMap.ERROR || 0,
    },
  };
});
