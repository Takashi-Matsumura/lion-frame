import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

const SETTING_KEY = "google_oauth_enabled";

/**
 * GET /api/admin/google-oauth
 * Google OAuthの有効/無効状態を取得
 */
export const GET = apiHandler(async () => {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: SETTING_KEY },
  });

  // デフォルトは無効
  const enabled = setting?.value === "true";

  return { enabled };
}, { public: true });

/**
 * POST /api/admin/google-oauth
 * Google OAuthの有効/無効を切り替え（ADMIN専用）
 */
export const POST = apiHandler(async (request, session) => {
  const { enabled } = await request.json();

  if (typeof enabled !== "boolean") {
    throw ApiError.badRequest("Invalid request body");
  }

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: String(enabled) },
    create: { key: SETTING_KEY, value: String(enabled) },
  });

  await AuditService.log({
    action: "OAUTH_TOGGLE",
    category: "SYSTEM_SETTING",
    userId: session.user.id,
    details: { provider: "google", enabled },
  });

  return { success: true, enabled };
}, { admin: true });
