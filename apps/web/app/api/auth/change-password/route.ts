import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
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
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 新パスワードのバリデーション
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        {
          error: "New password must be at least 8 characters",
          errorJa: "新しいパスワードは8文字以上必要です",
        },
        { status: 400 },
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
      return NextResponse.json(
        { error: "User not found", errorJa: "ユーザが見つかりません" },
        { status: 404 },
      );
    }

    // forcePasswordChange でない場合は現在のパスワードを検証
    if (!user.forcePasswordChange) {
      if (!currentPassword || typeof currentPassword !== "string") {
        return NextResponse.json(
          {
            error: "Current password is required",
            errorJa: "現在のパスワードを入力してください",
          },
          { status: 400 },
        );
      }

      if (!user.password) {
        return NextResponse.json(
          {
            error: "No password set for this account. Use OAuth to sign in.",
            errorJa: "このアカウントにはパスワードが設定されていません。OAuthでログインしてください。",
          },
          { status: 400 },
        );
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json(
          {
            error: "Current password is incorrect",
            errorJa: "現在のパスワードが正しくありません",
          },
          { status: 400 },
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

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      {
        error: "Failed to change password",
        errorJa: "パスワードの変更に失敗しました",
      },
      { status: 500 },
    );
  }
}
