import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * POST /api/admin/users/bulk-delete
 *
 * ユーザアカウントを一括削除する。
 *
 * ボディ:
 * - userIds: string[] — 削除対象のユーザID配列
 */
export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { userIds } = body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw ApiError.badRequest(
      "userIds must be a non-empty array",
      "削除対象のユーザIDが必要です",
    );
  }

  // 自分自身が含まれていないかチェック
  if (userIds.includes(session.user.id)) {
    throw ApiError.badRequest(
      "Cannot delete your own account",
      "自分自身のアカウントは削除できません",
    );
  }

  // 削除前にユーザ情報を記録
  const usersToDelete = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (usersToDelete.length === 0) {
    throw ApiError.notFound(
      "No users found for the given IDs",
      "指定されたIDのユーザが見つかりません",
    );
  }

  // 一括削除
  const result = await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });

  // 監査ログ記録
  await AuditService.log({
    action: "BULK_USER_DELETE",
    category: "USER_MANAGEMENT",
    userId: session.user.id,
    targetType: "User",
    details: {
      deletedCount: result.count,
      deletedUsers: usersToDelete.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    },
  }).catch(() => {});

  // 管理者通知
  const deletedNames = usersToDelete
    .map((u) => u.name || u.email)
    .join(", ");
  await NotificationService.broadcast({
    role: "ADMIN",
    type: "SECURITY",
    priority: "HIGH",
    title: `${result.count} user accounts bulk deleted`,
    titleJa: `${result.count}件のユーザーアカウントが一括削除されました`,
    message: `${result.count} retired user accounts (${deletedNames}) have been deleted by ${session.user.email}.`,
    messageJa: `退職者アカウント${result.count}件（${deletedNames}）が ${session.user.email} によって一括削除されました。`,
    source: "ADMIN",
    metadata: {
      deletedCount: result.count,
      deletedUsers: usersToDelete,
    },
  }).catch((err) => {
    console.error("[Bulk Delete] Failed to create notification:", err);
  });

  return {
    deleted: result.count,
  };
}, { admin: true });
