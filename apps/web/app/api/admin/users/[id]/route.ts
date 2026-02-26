import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * DELETE /api/admin/users/[id]
 *
 * ユーザを削除
 *
 * 制約:
 * - 自分自身は削除できない
 * - ADMIN権限が必要
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    // 自分自身を削除しようとしていないか確認
    if (id === session.user.id) {
      throw ApiError.badRequest("Cannot delete your own account");
    }

    // ユーザが存在するか確認
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // 削除前にユーザ情報を記録
    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    // ユーザを削除
    await prisma.user.delete({
      where: { id },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "USER_DELETE",
      category: "USER_MANAGEMENT",
      userId: session.user.id,
      targetId: id,
      targetType: "User",
      details: { deletedUser: userInfo },
    }).catch(() => {});

    // 全管理者にユーザー削除通知を発行
    await NotificationService.broadcast({
      role: "ADMIN",
      type: "SECURITY",
      priority: "HIGH",
      title: "User account deleted",
      titleJa: "ユーザーアカウントが削除されました",
      message: `User "${user.name || user.email}" (${user.role}) has been deleted by ${session.user.email}.`,
      messageJa: `ユーザー「${user.name || user.email}」（${user.role}）が ${session.user.email} によって削除されました。`,
      source: "ADMIN",
      metadata: userInfo,
    }).catch((err) => {
      console.error("[User Delete] Failed to create notification:", err);
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
