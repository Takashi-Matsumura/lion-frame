import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/announcements
 * アクティブなアナウンスを取得（認証不要、ログイン済みなら非表示分を除外）
 */
export const GET = apiHandler(
  async (_request, session) => {
    const now = new Date();

    // セッションからユーザーIDを取得（publicなのでsessionはnullの可能性あり）
    const userId = session?.user?.id ?? null;

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

    return { announcements };
  },
  { public: true },
);
