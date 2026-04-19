import bcrypt from "bcryptjs";
import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * POST /api/auth/change-password
 *
 * ユーザ自身のパスワードを変更する。
 *
 * - forcePasswordChange === true の場合: 現在のパスワード不要
 * - forcePasswordChange === false の場合: 現在のパスワードを bcrypt 照合
 * - 新パスワードは8文字以上
 */
export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { currentPassword, newPassword } = body;

  // 新パスワードのバリデーション
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "New password must be at least 8 characters",
      "新しいパスワードは8文字以上必要です",
    );
  }

  // ユーザを取得
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      password: true,
      forcePasswordChange: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found", "ユーザが見つかりません");
  }

  // forcePasswordChange でない場合は現在のパスワードを検証
  if (!user.forcePasswordChange) {
    if (!currentPassword || typeof currentPassword !== "string") {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        "Current password is required",
        "現在のパスワードを入力してください",
      );
    }

    if (!user.password) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        "No password set for this account. Contact your administrator.",
        "このアカウントにはパスワードが設定されていません。管理者にお問い合わせください。",
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        "Current password is incorrect",
        "現在のパスワードが正しくありません",
      );
    }
  }

  // 新パスワードをハッシュ化して保存
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      forcePasswordChange: false,
      passwordExpiresAt: null,
    },
  });

  // 監査ログ記録
  await AuditService.log({
    action: "PASSWORD_CHANGE",
    category: "AUTH",
    userId: user.id,
    targetId: user.id,
    targetType: "User",
    details: {
      forced: user.forcePasswordChange,
    },
  }).catch(() => {});

  return {
    success: true,
    message: "Password changed successfully",
  };
});
