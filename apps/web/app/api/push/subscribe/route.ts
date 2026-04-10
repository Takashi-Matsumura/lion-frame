import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/push/subscribe
 * プッシュ通知のサブスクリプションを登録
 */
export const POST = apiHandler(
  async (request, session) => {
    const { subscription } = await request.json();

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      throw ApiError.badRequest(
        "Invalid subscription data",
        "無効なサブスクリプションデータです",
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      throw ApiError.notFound("User not found", "ユーザーが見つかりません");
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: request.headers.get("user-agent") || undefined,
      },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return { success: true };
  },
  { successStatus: 201 },
);

/**
 * DELETE /api/push/subscribe
 * プッシュ通知のサブスクリプションを解除
 */
export const DELETE = apiHandler(async (request, session) => {
  const { endpoint } = await request.json();

  if (!endpoint) {
    throw ApiError.badRequest(
      "Endpoint is required",
      "エンドポイントが必要です",
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });

  if (!user) {
    throw ApiError.notFound("User not found", "ユーザーが見つかりません");
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint,
      userId: user.id,
    },
  });

  return { success: true };
});
