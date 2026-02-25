import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

export class SystemEventService {
  /**
   * サーバ起動時にBuild ID変更を検出し、自動アナウンスを作成する
   */
  static async handleBuildIdChange(): Promise<void> {
    const currentBuildId = process.env.NEXT_BUILD_ID;

    // 開発環境ではスキップ
    if (!currentBuildId || currentBuildId === "dev") {
      return;
    }

    try {
      const lastBuildSetting = await prisma.systemSetting.findUnique({
        where: { key: "last_build_id" },
      });

      const lastBuildId = lastBuildSetting?.value;

      // Build IDが一致する場合は何もしない
      if (lastBuildId === currentBuildId) {
        return;
      }

      // 自動アナウンスを作成
      await this.createSystemUpdateAnnouncement();

      // Build IDを更新
      await prisma.systemSetting.upsert({
        where: { key: "last_build_id" },
        update: { value: currentBuildId },
        create: { key: "last_build_id", value: currentBuildId },
      });

      console.log(
        `[SystemEventService] Build ID changed: ${lastBuildId ?? "(none)"} → ${currentBuildId}`,
      );
    } catch (error) {
      // サーバ起動を妨げないようエラーをログに留める
      console.error(
        "[SystemEventService] Failed to handle build ID change:",
        error,
      );
    }
  }

  private static async createSystemUpdateAnnouncement(): Promise<void> {
    const announcementTitle = "System Updated — Please Sign In Again";

    // 直近5分以内に同一タイトルのアクティブアナウンスが存在するか確認（重複防止）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentDuplicate = await prisma.announcement.findFirst({
      where: {
        title: announcementTitle,
        isActive: true,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (recentDuplicate) {
      console.log(
        "[SystemEventService] Skipping duplicate announcement (created within last 5 minutes)",
      );
      return;
    }

    // 以前の自動アナウンスを非アクティブ化（スタッキング防止）
    await prisma.announcement.updateMany({
      where: {
        title: announcementTitle,
        isActive: true,
      },
      data: { isActive: false },
    });

    // 最初のADMINユーザーをcreatedByとして使用
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!adminUser) {
      console.warn(
        "[SystemEventService] No ADMIN user found — skipping announcement creation",
      );
      return;
    }

    // 4時間有効のアナウンスを作成
    const endAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    await prisma.announcement.create({
      data: {
        title: announcementTitle,
        titleJa: "システムが更新されました — 再ログインしてください",
        message:
          "The system has been updated. Your previous session has been invalidated for security. Please sign in again.",
        messageJa:
          "システムが更新されました。セキュリティのため以前のセッションは無効化されています。再度ログインしてください。",
        level: "info",
        isActive: true,
        endAt,
        createdBy: adminUser.id,
      },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "ANNOUNCEMENT_CREATE",
      category: "SYSTEM_SETTING",
      userId: adminUser.id,
      details: {
        source: "SYSTEM_AUTO",
        title: announcementTitle,
        endAt: endAt.toISOString(),
      },
    });
  }
}
