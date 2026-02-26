import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * GET /api/admin/announcements
 * 全アナウンスを取得（管理者のみ）
 */
export const GET = apiHandler(async (_request, session) => {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return { announcements };
}, { admin: true });

/**
 * POST /api/admin/announcements
 * 新規アナウンスを作成（管理者のみ）
 */
export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { title, titleJa, message, messageJa, level, startAt, endAt, notifyUsers } = body;

  // 日本語が必須、英語は任意
  if (!titleJa || !messageJa) {
    throw ApiError.badRequest("Title and message (Japanese) are required");
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: title || titleJa, // 英語がない場合は日本語をフォールバック
      titleJa,
      message: message || messageJa, // 英語がない場合は日本語をフォールバック
      messageJa,
      level: level || "info",
      startAt: startAt ? new Date(startAt) : new Date(),
      endAt: endAt ? new Date(endAt) : null,
      createdBy: session.user.id,
    },
  });

  // 監査ログに記録
  await AuditService.log({
    action: "ANNOUNCEMENT_CREATE",
    category: "SYSTEM_SETTING",
    userId: session.user.id,
    targetId: announcement.id,
    targetType: "Announcement",
    details: { title, level, notifyUsers: !!notifyUsers },
  }).catch(() => {});

  // ユーザーへ通知を配信
  if (notifyUsers) {
    const notificationType = level === "critical" || level === "warning" ? "WARNING" as const : "INFO" as const;
    await NotificationService.broadcast({
      type: notificationType,
      priority: level === "critical" ? "HIGH" : "NORMAL",
      title: title || titleJa,
      titleJa,
      message: message || messageJa,
      messageJa,
      source: "ANNOUNCEMENT",
      sourceId: announcement.id,
      broadcast: true,
    }).catch((err) => {
      console.error("[Announcement] Failed to broadcast notification:", err);
    });
  }

  return { success: true, announcement };
}, { admin: true, successStatus: 201 });
