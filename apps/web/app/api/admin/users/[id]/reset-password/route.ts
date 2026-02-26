import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * POST /api/admin/users/[id]/reset-password
 *
 * 管理者がユーザのパスワードをリセットし、仮パスワードを発行する。
 * ユーザは次回ログイン時にパスワード変更を強制される。
 *
 * 制約:
 * - ADMIN権限が必要
 * - 自分自身のリセットは不可
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 自分自身のリセットは禁止
    if (id === session.user.id) {
      return NextResponse.json(
        {
          error: "Cannot reset your own password",
          errorJa: "自分自身のパスワードはリセットできません",
        },
        { status: 400 },
      );
    }

    // ユーザが存在するか確認
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", errorJa: "ユーザが見つかりません" },
        { status: 404 },
      );
    }

    // 8文字のランダム仮パスワードを生成（英数字）
    const temporaryPassword = crypto
      .randomBytes(6)
      .toString("base64url")
      .slice(0, 8);

    // bcrypt でハッシュ化
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // パスワードと forcePasswordChange フラグを更新
    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        forcePasswordChange: true,
        passwordExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    // 監査ログ記録
    await AuditService.log({
      action: "PASSWORD_RESET",
      category: "USER_MANAGEMENT",
      userId: session.user.id,
      targetId: id,
      targetType: "User",
      details: {
        targetName: user.name,
        targetEmail: user.email,
        resetBy: session.user.email,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      temporaryPassword,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      {
        error: "Failed to reset password",
        errorJa: "パスワードのリセットに失敗しました",
      },
      { status: 500 },
    );
  }
}
