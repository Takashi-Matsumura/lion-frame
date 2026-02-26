import { ApiError, apiHandler } from "@/lib/api";
import { AIService, LOCAL_LLM_DEFAULTS } from "@/lib/core-modules/ai";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/admin/ai
 * AI設定を取得（管理者のみ）
 */
export const GET = apiHandler(async () => {
  const config = await AIService.getConfig();

  // APIキーはマスクして返す
  return {
    config: {
      ...config,
      apiKey: config.apiKey ? `***${config.apiKey.slice(-4)}` : null,
      hasApiKey: !!config.apiKey,
    },
    localLLMDefaults: LOCAL_LLM_DEFAULTS,
  };
}, { admin: true });

/**
 * PATCH /api/admin/ai
 * AI設定を更新（管理者のみ）
 */
export const PATCH = apiHandler(async (request, session) => {
  const body = await request.json();
  const {
    enabled,
    provider,
    apiKey,
    model,
    localProvider,
    localEndpoint,
    localModel,
  } = body;

  await AIService.updateConfig({
    ...(enabled !== undefined && { enabled }),
    ...(provider !== undefined && { provider }),
    ...(apiKey !== undefined && { apiKey }),
    ...(model !== undefined && { model }),
    ...(localProvider !== undefined && { localProvider }),
    ...(localEndpoint !== undefined && { localEndpoint }),
    ...(localModel !== undefined && { localModel }),
  });

  // 監査ログに記録
  await AuditService.log({
    action: "AI_CONFIG_UPDATE",
    category: "SYSTEM_SETTING",
    userId: session.user.id,
    details: {
      enabled,
      provider,
      model,
      localProvider,
      localEndpoint,
      localModel,
      apiKeyChanged: apiKey !== undefined,
    },
  }).catch(() => {});

  const config = await AIService.getConfig();

  return {
    success: true,
    config: {
      ...config,
      apiKey: config.apiKey ? `***${config.apiKey.slice(-4)}` : null,
      hasApiKey: !!config.apiKey,
    },
  };
}, { admin: true });

/**
 * POST /api/admin/ai
 * ローカルLLM接続テスト（管理者のみ）
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { action } = body;

  if (action === "test-connection") {
    const result = await AIService.testLocalConnection();
    return result;
  }

  throw ApiError.badRequest("Invalid action");
}, { admin: true });
