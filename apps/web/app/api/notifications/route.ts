import type { NotificationPriority, NotificationType } from "@prisma/client";
import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * GET /api/notifications
 * 通知一覧を取得（ページネーション対応）
 */
export const GET = apiHandler(async (request, session) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });

  if (!user) {
    throw ApiError.notFound("User not found", "ユーザーが見つかりません");
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Math.min(
    parseInt(url.searchParams.get("pageSize") || "20", 10),
    100,
  );
  const type = url.searchParams.get("type") as NotificationType | null;
  const isReadParam = url.searchParams.get("isRead");
  const isRead =
    isReadParam === "true" ? true : isReadParam === "false" ? false : undefined;

  // 確率的クリーンアップ（1%の確率で期限切れ通知を削除）
  if (Math.random() < 0.01) {
    NotificationService.cleanupAll().catch(() => {});
  }

  const where = {
    userId: user.id,
    ...(type && { type }),
    ...(isRead !== undefined && { isRead }),
    // 期限切れ通知を除外
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
    pageSize,
    unreadCount,
  };
});

/**
 * POST /api/notifications
 * 通知を作成（管理者またはシステム用）
 */
export const POST = apiHandler(
  async (request, session) => {
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true },
    });

    if (!currentUser) {
      throw ApiError.notFound("User not found", "ユーザーが見つかりません");
    }

    const body = await request.json();
    const {
      userId,
      userIds,
      role,
      broadcast,
      type,
      priority,
      title,
      titleJa,
      message,
      messageJa,
      actionUrl,
      actionLabel,
      actionLabelJa,
      source,
      sourceId,
      metadata,
      expiresAt,
    } = body;

    if (!title || !message || !type) {
      throw ApiError.badRequest(
        "title, message, and type are required",
        "title、message、typeは必須です",
      );
    }

    // ブロードキャスト通知
    if (broadcast || userIds || role) {
      const result = await NotificationService.broadcast({
        userIds,
        role,
        broadcast,
        type: type as NotificationType,
        priority: priority as NotificationPriority | undefined,
        title,
        titleJa,
        message,
        messageJa,
        actionUrl,
        actionLabel,
        actionLabelJa,
        source,
        sourceId,
        metadata,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      return {
        success: true,
        count: result.count,
      };
    }

    // 単一ユーザへの通知
    const targetUserId = userId || currentUser.id;
    const notification = await NotificationService.create({
      userId: targetUserId,
      type: type as NotificationType,
      priority: priority as NotificationPriority | undefined,
      title,
      titleJa,
      message,
      messageJa,
      actionUrl,
      actionLabel,
      actionLabelJa,
      source,
      sourceId,
      metadata,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return { success: true, notification };
  },
  { admin: true },
);
