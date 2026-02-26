import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";
import { verifyTotp } from "@/lib/totp";

/**
 * POST /api/user/two-factor/enable
 * Enable 2FA after verifying the TOTP code
 */
export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { secret, code } = body;

  if (!secret || !code) {
    throw ApiError.badRequest("Secret and code are required");
  }

  // Verify the TOTP code
  const isValid = verifyTotp(code, secret);

  if (!isValid) {
    throw ApiError.badRequest("Invalid verification code");
  }

  // Enable 2FA and save the secret
  const user = await prisma.user.update({
    where: { email: session.user.email! },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
    },
  });

  await AuditService.log({
    action: "TWO_FACTOR_ENABLE",
    category: "USER_MANAGEMENT",
    userId: user.id,
    targetId: user.id,
    targetType: "User",
  });

  // 2FA有効化通知を発行
  await NotificationService.securityNotify(user.id, {
    title: "Two-factor authentication enabled",
    titleJa: "2段階認証が有効になりました",
    message:
      "Two-factor authentication has been enabled for your account. You will need to enter a verification code when logging in.",
    messageJa:
      "アカウントの2段階認証が有効になりました。ログイン時に確認コードの入力が必要になります。",
  }).catch((err) => {
    console.error("[2FA] Failed to create notification:", err);
  });

  return { success: true };
});
