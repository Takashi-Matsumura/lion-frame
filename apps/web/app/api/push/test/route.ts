import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * POST /api/push/test
 * 現在のユーザにテスト通知を送信（プッシュ通知の動作確認用）
 */
export const POST = apiHandler(async (_request, session) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });

  if (!user) {
    throw ApiError.notFound("User not found", "ユーザーが見つかりません");
  }

  await NotificationService.create({
    userId: user.id,
    type: "INFO",
    priority: "NORMAL",
    title: "Test Push Notification",
    titleJa: "テストプッシュ通知",
    message:
      "This is a test notification. If you see this on your OS, push notifications are working correctly!",
    messageJa:
      "これはテスト通知です。OSの通知として表示されれば、プッシュ通知が正常に動作しています！",
    source: "PUSH_TEST",
    actionUrl: "/dashboard",
  });

  return { success: true };
});
