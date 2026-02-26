import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    // 自分自身のリセットは禁止
    if (id === session.user.id) {
      throw ApiError.badRequest(
        "Cannot reset your own password",
        "自分自身のパスワードはリセットできません",
      );
    }

    // ユーザが存在するか確認
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw ApiError.notFound("User not found", "ユーザが見つかりません");
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
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
