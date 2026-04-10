import type {
  NotificationPriority,
  NotificationType,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PushService } from "@/lib/services/push-service";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  titleJa?: string;
  message: string;
  messageJa?: string;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelJa?: string;
  source?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

interface BroadcastNotificationInput
  extends Omit<CreateNotificationInput, "userId"> {
  userIds?: string[];
  role?: Role;
  broadcast?: boolean;
}

/**
 * 通知タイプごとのデフォルト有効期限（日数）
 * ACTION は期限なし（ユーザーの対応が必要なため）
 */
const DEFAULT_EXPIRY_DAYS: Partial<Record<NotificationType, number>> = {
  SECURITY: 30,
  SYSTEM: 14,
  WARNING: 14,
  INFO: 7,
};

function computeDefaultExpiry(type: NotificationType): Date | undefined {
  const days = DEFAULT_EXPIRY_DAYS[type];
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export class NotificationService {
  /**
   * 単一ユーザへの通知作成
   */
  static async create(input: CreateNotificationInput) {
    const expiresAt = input.expiresAt ?? computeDefaultExpiry(input.type);

    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        priority: input.priority ?? "NORMAL",
        title: input.title,
        titleJa: input.titleJa,
        message: input.message,
        messageJa: input.messageJa,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        actionLabelJa: input.actionLabelJa,
        source: input.source,
        sourceId: input.sourceId,
        metadata: input.metadata
          ? JSON.parse(JSON.stringify(input.metadata))
          : undefined,
        expiresAt,
      },
    });

    // ユーザの言語に応じたプッシュ通知を非同期送信
    prisma.user
      .findUnique({
        where: { id: input.userId },
        select: { language: true },
      })
      .then((user) => {
        const isJa = user?.language === "ja";
        const pushTitle =
          isJa && input.titleJa ? input.titleJa : input.title;
        const pushBody =
          isJa && input.messageJa ? input.messageJa : input.message;
        return PushService.sendToUser(input.userId, {
          title: pushTitle,
          body: pushBody,
          url: input.actionUrl,
          type: input.type,
          tag: `notification-${notification.id}`,
        });
      })
      .catch((err) => {
        console.error("[NotificationService] Push failed:", err);
      });

    return notification;
  }

  /**
   * 複数ユーザへの通知作成（ブロードキャスト）
   */
  static async broadcast(input: BroadcastNotificationInput) {
    let userIds: string[] = [];

    if (input.userIds) {
      userIds = input.userIds;
    } else if (input.role) {
      const users = await prisma.user.findMany({
        where: { role: input.role },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else if (input.broadcast) {
      const users = await prisma.user.findMany({
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    if (userIds.length === 0) return { count: 0 };

    const expiresAt = input.expiresAt ?? computeDefaultExpiry(input.type);

    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: input.type,
        priority: input.priority ?? "NORMAL",
        title: input.title,
        titleJa: input.titleJa,
        message: input.message,
        messageJa: input.messageJa,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        actionLabelJa: input.actionLabelJa,
        source: input.source,
        sourceId: input.sourceId,
        metadata: input.metadata
          ? JSON.parse(JSON.stringify(input.metadata))
          : undefined,
        expiresAt,
      })),
    });

    // 全対象ユーザにプッシュ通知を非同期送信
    PushService.sendToUsers(userIds, {
      title: input.title,
      body: input.message,
      url: input.actionUrl,
      type: input.type,
    }).catch((err) => {
      console.error("[NotificationService] Broadcast push failed:", err);
    });

    return notifications;
  }

  /**
   * システム通知（全ユーザ向け）
   */
  static async systemNotify(options: {
    title: string;
    titleJa?: string;
    message: string;
    messageJa?: string;
    priority?: NotificationPriority;
    actionUrl?: string;
    actionLabel?: string;
    actionLabelJa?: string;
  }) {
    return NotificationService.broadcast({
      ...options,
      type: "SYSTEM",
      broadcast: true,
      source: "SYSTEM",
    });
  }

  /**
   * セキュリティ通知（特定ユーザ向け）
   */
  static async securityNotify(
    userId: string,
    options: {
      title: string;
      titleJa?: string;
      message: string;
      messageJa?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return NotificationService.create({
      ...options,
      userId,
      type: "SECURITY",
      priority: "HIGH",
      source: "SECURITY",
    });
  }

  /**
   * アクション通知（承認依頼等）
   */
  static async actionNotify(
    userId: string,
    options: {
      title: string;
      titleJa?: string;
      message: string;
      messageJa?: string;
      actionUrl: string;
      actionLabel: string;
      actionLabelJa?: string;
      source?: string;
      sourceId?: string;
    },
  ) {
    return NotificationService.create({
      ...options,
      userId,
      type: "ACTION",
      priority: "NORMAL",
    });
  }

  /**
   * ログイン通知の一括削除（既存ゴミデータ除去用）
   */
  static async purgeLoginNotifications() {
    return prisma.notification.deleteMany({
      where: {
        source: "SECURITY",
        OR: [
          { title: { contains: "login detected" } },
          { titleJa: { contains: "ログインを検出" } },
          { source: "AUTH" },
        ],
      },
    });
  }

  /**
   * 期限切れ通知の削除
   */
  static async cleanupExpired() {
    return prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * 古い既読通知の削除
   */
  static async cleanupOldRead(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
  }

  /**
   * 期限切れ＋古い既読通知の一括クリーンアップ
   */
  static async cleanupAll() {
    const [expired, oldRead] = await Promise.all([
      NotificationService.cleanupExpired(),
      NotificationService.cleanupOldRead(),
    ]);
    return { expired: expired.count, oldRead: oldRead.count };
  }
}
