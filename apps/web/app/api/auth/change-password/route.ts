import bcrypt from "bcryptjs";
import { ApiError, apiHandler } from "@/lib/api";
import {
  MIN_PASSWORD_LENGTH,
  validatePassword,
  type ValidationError,
} from "@/lib/password/validator";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * POST /api/auth/change-password
 *
 * ユーザ自身のパスワードを変更する。
 *
 * - forcePasswordChange === true の場合: 現在のパスワード不要
 * - forcePasswordChange === false の場合: 現在のパスワードを bcrypt 照合
 * - 新パスワードは lib/password/validator の規則を満たす必要がある
 */
function validationErrorMessage(
  err: ValidationError,
): { message: string; messageJa: string } {
  switch (err) {
    case "TOO_SHORT":
      return {
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        messageJa: `パスワードは ${MIN_PASSWORD_LENGTH} 文字以上で入力してください`,
      };
    case "BLACKLISTED":
      return {
        message: "This password is too common. Please choose a different one.",
        messageJa:
          "よく使われるパスワードのため使用できません。別のパスワードを設定してください。",
      };
    case "CONTAINS_USER_INFO":
      return {
        message:
          "Password must not contain your email address or name.",
        messageJa:
          "メールアドレスや氏名を含むパスワードは使用できません。",
      };
    case "REPEATED_CHARS":
      return {
        message: "Password must not repeat the same character 4 or more times.",
        messageJa: "同じ文字を 4 回以上連続させないでください。",
      };
  }
}

export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!newPassword || typeof newPassword !== "string") {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "New password is required",
      "新しいパスワードを入力してください",
    );
  }

  // ユーザを取得（validator にユーザ情報を渡す）
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      forcePasswordChange: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found", "ユーザが見つかりません");
  }

  // 新パスワードのバリデーション
  const result = validatePassword(newPassword, {
    email: user.email,
    name: user.name,
  });
  if (!result.valid) {
    const first = result.errors[0];
    const { message, messageJa } = validationErrorMessage(first);
    throw new ApiError(400, "BAD_REQUEST", message, messageJa);
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
