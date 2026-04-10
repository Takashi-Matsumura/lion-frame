import { prisma } from "@/lib/prisma";
import { getWebPush, type PushSubscriptionData } from "@/lib/services/web-push";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
  type?: string;
}

export class PushService {
  /**
   * 特定ユーザの全デバイスにプッシュ通知を送信
   */
  static async sendToUser(
    userId: string,
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return { sent: 0, failed: 0 };

    const jsonPayload = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const pushSub: PushSubscriptionData = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        await getWebPush().sendNotification(pushSub, jsonPayload);
        sent++;
      } catch (error: unknown) {
        const statusCode =
          error instanceof Error && "statusCode" in error
            ? (error as { statusCode: number }).statusCode
            : undefined;
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * 複数ユーザへの一括プッシュ送信
   */
  static async sendToUsers(
    userIds: string[],
    payload: PushPayload,
  ): Promise<void> {
    await Promise.allSettled(
      userIds.map((userId) => PushService.sendToUser(userId, payload)),
    );
  }
}
