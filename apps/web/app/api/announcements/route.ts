import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/announcements
 * アクティブなアナウンスを取得（認証不要、ログイン済みなら非表示分を除外）
 */
export async function GET() {
  try {
    const now = new Date();

    // セッションを取得（未認証でもエラーにしない）
    let userId: string | null = null;
    try {
      const session = await auth();
      userId = session?.user?.id ?? null;
    } catch {
      // 未認証でも続行
    }

    // 非表示にしたアナウンスIDを取得
    let dismissedIds: string[] = [];
    if (userId) {
      const dismissals = await prisma.announcementDismissal.findMany({
        where: { userId },
        select: { announcementId: true },
      });
      dismissedIds = dismissals.map((d) => d.announcementId);
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gt: now } }],
        ...(dismissedIds.length > 0 && {
          id: { notIn: dismissedIds },
        }),
      },
      orderBy: [
        { level: "desc" }, // critical > warning > info
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        titleJa: true,
        message: true,
        messageJa: true,
        level: true,
        startAt: true,
        endAt: true,
      },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 },
    );
  }
}
