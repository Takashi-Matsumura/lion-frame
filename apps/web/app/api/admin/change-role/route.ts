import type { Role } from "@prisma/client";
import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";

export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { userId, role } = body;

  // Validate role
  if (!["USER", "ADMIN", "MANAGER"].includes(role)) {
    throw ApiError.badRequest("Invalid role");
  }

  // Prevent admin from changing their own role
  if (userId === session.user.id) {
    throw ApiError.badRequest("Cannot change your own role");
  }

  // Get current user to record old role
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true, email: true },
  });

  if (!currentUser) {
    throw ApiError.notFound("User not found");
  }

  const oldRole = currentUser.role;

  // Update user role
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: role as Role },
  });

  // 監査ログに記録
  await AuditService.log({
    action: "USER_ROLE_CHANGE",
    category: "USER_MANAGEMENT",
    userId: session.user.id,
    targetId: userId,
    targetType: "User",
    details: {
      oldRole,
      newRole: role,
      targetUserName: currentUser.name,
      targetUserEmail: currentUser.email,
    },
  }).catch(() => {});

  // ロール変更通知を発行
  const roleLabels: Record<string, { en: string; ja: string }> = {
    USER: { en: "User", ja: "ユーザー" },
    MANAGER: { en: "Manager", ja: "管理職" },
    ADMIN: { en: "Administrator", ja: "管理者" },
  };
  const roleLabel = roleLabels[role] || { en: role, ja: role };

  await NotificationService.actionNotify(userId, {
    title: "Your role has been changed",
    titleJa: "ロールが変更されました",
    message: `Your role has been changed to ${roleLabel.en}.`,
    messageJa: `あなたのロールが「${roleLabel.ja}」に変更されました。`,
    actionUrl: "/dashboard",
    actionLabel: "View Dashboard",
    actionLabelJa: "ダッシュボードを見る",
    source: "ADMIN",
  }).catch((err) => {
    console.error("[Role] Failed to create notification:", err);
  });

  return {
    success: true,
    user: {
      id: updatedUser.id,
      role: updatedUser.role,
    },
  };
}, { admin: true });
