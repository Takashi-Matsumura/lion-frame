import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/brave-api-key
 * ユーザのBrave API Keyを取得
 */
export const GET = apiHandler(async (_request, session) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { braveApiKey: true },
  });

  if (!user) {
    throw ApiError.notFound("User not found", "ユーザーが見つかりません");
  }

  return {
    braveApiKey: user.braveApiKey || null,
    hasKey: !!user.braveApiKey,
  };
});

/**
 * PUT /api/user/brave-api-key
 * ユーザのBrave API Keyを保存・更新
 */
export const PUT = apiHandler(async (request, session) => {
  const body = await request.json();
  const { braveApiKey } = body;

  // APIキーのバリデーション（空文字列の場合はnullに設定）
  const apiKeyValue = braveApiKey?.trim() || null;

  const user = await prisma.user.update({
    where: { email: session.user.email! },
    data: { braveApiKey: apiKeyValue },
    select: { braveApiKey: true },
  });

  return {
    success: true,
    braveApiKey: user.braveApiKey,
    hasKey: !!user.braveApiKey,
  };
});

/**
 * DELETE /api/user/brave-api-key
 * ユーザのBrave API Keyを削除
 */
export const DELETE = apiHandler(async (_request, session) => {
  await prisma.user.update({
    where: { email: session.user.email! },
    data: { braveApiKey: null },
  });

  return {
    success: true,
    message: "Brave API Key deleted successfully",
  };
});
