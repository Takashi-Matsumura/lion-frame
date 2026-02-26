import { ApiError, apiHandler } from "@/lib/api";
import { isOrgContextEnabled } from "@/lib/core-modules/ai/services/org-context";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/user/org-context
 * ユーザーの組織データ連携設定とシステムレベルの有効/無効を取得
 */
export const GET = apiHandler(async (_request, session) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { orgContextEnabled: true },
  });

  const systemEnabled = await isOrgContextEnabled();

  return {
    userEnabled: user?.orgContextEnabled ?? true,
    systemEnabled,
  };
});

/**
 * PUT /api/user/org-context
 * ユーザーの組織データ連携設定を更新
 */
export const PUT = apiHandler(async (request, session) => {
  const { enabled } = await request.json();

  if (typeof enabled !== "boolean") {
    throw ApiError.badRequest("enabled must be a boolean");
  }

  await prisma.user.update({
    where: { email: session.user.email! },
    data: { orgContextEnabled: enabled },
  });

  await AuditService.log({
    action: "ORG_CONTEXT_TOGGLE",
    category: "MODULE",
    userId: session.user.id,
    details: { enabled },
  });

  return {
    success: true,
    enabled,
  };
});
