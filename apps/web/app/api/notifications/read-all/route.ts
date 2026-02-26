import type { NotificationType } from "@prisma/client";
import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/notifications/read-all
 * 通知を一括既読にする
 */
export const POST = apiHandler(async (request, session) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });

  if (!user) {
    throw ApiError.notFound("User not found", "ユーザーが見つかりません");
  }

  const body = await request.json().catch(() => ({}));
  const { ids, type } = body as {
    ids?: string[];
    type?: NotificationType;
  };

  const where = {
    userId: user.id,
    isRead: false,
    ...(ids && ids.length > 0 && { id: { in: ids } }),
    ...(type && { type }),
  };

  const result = await prisma.notification.updateMany({
    where,
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    success: true,
    count: result.count,
  };
});
