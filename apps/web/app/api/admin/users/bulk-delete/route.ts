import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        {
          error: "userIds must be a non-empty array",
          errorJa: "削除対象のユーザIDが必要です",
        },
        { status: 400 },
      );
    }

    // 自分自身が含まれていないかチェック
    if (userIds.includes(session.user.id)) {
      return NextResponse.json(
        {
          error: "Cannot delete your own account",
          errorJa: "自分自身のアカウントは削除できません",
        },
        { status: 400 },
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
      return NextResponse.json(
        {
          error: "No users found for the given IDs",
          errorJa: "指定されたIDのユーザが見つかりません",
        },
        { status: 404 },
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

    return NextResponse.json({
      deleted: result.count,
    });
  } catch (error) {
    console.error("Error bulk deleting users:", error);
    return NextResponse.json(
      {
        error: "Failed to bulk delete users",
        errorJa: "ユーザの一括削除に失敗しました",
      },
      { status: 500 },
    );
  }
}
