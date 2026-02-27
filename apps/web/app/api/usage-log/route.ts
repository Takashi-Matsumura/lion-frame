import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/usage-log
 * ページアクセスを UsageLog に記録（内部用・認証済みユーザのみ）
 * middlewareからfire-and-forgetで呼び出される
 */
export const POST = apiHandler(async (request, session) => {
  const { path } = await request.json();

  // バリデーション: 内部パスのみ許可
  if (!path || typeof path !== "string" || !path.startsWith("/")) {
    return { ok: true };
  }

  const userId = session.user?.id;
  if (!userId) return { ok: true };

  // 重複抑制: 同一ユーザ・同一パスで直近5秒以内のログがあればスキップ
  const fiveSecondsAgo = new Date(Date.now() - 5000);
  const recent = await prisma.usageLog.findFirst({
    where: {
      userId,
      path,
      createdAt: { gte: fiveSecondsAgo },
    },
  });
  if (recent) return { ok: true };

  await prisma.usageLog.create({
    data: { userId, path },
  });

  return { ok: true };
});
