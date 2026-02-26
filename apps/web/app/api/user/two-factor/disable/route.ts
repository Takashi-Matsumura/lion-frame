import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";
import { verifyTotp } from "@/lib/totp";

/**
 * POST /api/user/two-factor/disable
 * Disable 2FA after verifying the TOTP code
 */
export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { code } = body;

  if (!code) {
    throw ApiError.badRequest("Verification code is required");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
    throw ApiError.badRequest(
      "Two-factor authentication is not enabled",
    );
  }

  // Verify the TOTP code
  const isValid = verifyTotp(code, user.twoFactorSecret);

  if (!isValid) {
    throw ApiError.badRequest("Invalid verification code");
  }

  // Disable 2FA
  const updatedUser = await prisma.user.update({
    where: { email: session.user.email! },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  await AuditService.log({
    action: "TWO_FACTOR_DISABLE",
    category: "USER_MANAGEMENT",
    userId: updatedUser.id,
    targetId: updatedUser.id,
    targetType: "User",
  });

  // 2FA無効化通知を発行
  await NotificationService.securityNotify(updatedUser.id, {
    title: "Two-factor authentication disabled",
    titleJa: "2段階認証が無効になりました",
    message:
      "Two-factor authentication has been disabled for your account. Your account security has been reduced.",
    messageJa:
      "アカウントの2段階認証が無効になりました。アカウントのセキュリティレベルが低下しています。",
  }).catch((err) => {
    console.error("[2FA] Failed to create notification:", err);
  });

  return { success: true };
});
