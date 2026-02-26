import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/admin/announcements/[id]
 * 特定のアナウンスを取得（管理者のみ）
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!announcement) {
      throw ApiError.notFound("Announcement not found", "アナウンスが見つかりません");
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error fetching announcement:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcement" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/announcements/[id]
 * アナウンスを更新（管理者のみ）
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      titleJa,
      message,
      messageJa,
      level,
      isActive,
      startAt,
      endAt,
    } = body;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleJa !== undefined && { titleJa }),
        ...(message !== undefined && { message }),
        ...(messageJa !== undefined && { messageJa }),
        ...(level !== undefined && { level }),
        ...(isActive !== undefined && { isActive }),
        ...(startAt !== undefined && { startAt: new Date(startAt) }),
        ...(endAt !== undefined && { endAt: endAt ? new Date(endAt) : null }),
      },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "ANNOUNCEMENT_UPDATE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      targetId: id,
      targetType: "Announcement",
      details: { title: announcement.title, isActive: announcement.isActive },
    }).catch(() => {});

    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      { error: "Failed to update announcement" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/announcements/[id]
 * アナウンスを削除（管理者のみ）
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw ApiError.notFound("Announcement not found", "アナウンスが見つかりません");
    }

    await prisma.announcement.delete({
      where: { id },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "ANNOUNCEMENT_DELETE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      targetId: id,
      targetType: "Announcement",
      details: { title: announcement.title },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement" },
      { status: 500 },
    );
  }
}
