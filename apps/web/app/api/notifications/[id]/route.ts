import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/[id]
 * 通知の詳細を取得
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      throw ApiError.notFound("User not found", "ユーザーが見つかりません");
    }

    const { id } = await params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });

    if (!notification) {
      throw ApiError.notFound(
        "Notification not found",
        "通知が見つかりません",
      );
    }

    return NextResponse.json({ notification });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Failed to get notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/notifications/[id]
 * 通知を更新（既読状態の変更）
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      throw ApiError.notFound("User not found", "ユーザーが見つかりません");
    }

    const { id } = await params;

    // 所有者確認
    const existing = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      throw ApiError.notFound(
        "Notification not found",
        "通知が見つかりません",
      );
    }

    const body = await request.json();
    const { isRead } = body;

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: isRead ?? existing.isRead,
        readAt: isRead ? new Date() : existing.readAt,
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Failed to update notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 * 通知を削除
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      throw ApiError.notFound("User not found", "ユーザーが見つかりません");
    }

    const { id } = await params;

    // 所有者確認
    const existing = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      throw ApiError.notFound(
        "Notification not found",
        "通知が見つかりません",
      );
    }

    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Failed to delete notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
