import { ApiError, apiHandler } from "@/lib/api";
import { AIService } from "@/lib/core-modules/ai";
import { isOrgContextEnabled } from "@/lib/core-modules/ai/services/org-context";
import {
  isRagAvailable,
  getUserRagDocumentCount,
} from "@/lib/core-modules/ai/services/rag-context";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/ai/chat
 * AIチャットの利用可否とプロバイダ情報を取得
 */
export const GET = apiHandler(async (_request, session) => {
  const available = await AIService.isAvailable();
  const config = await AIService.getConfig();

  // プロバイダ名とモデル名を取得
  let providerName: string;
  let modelName: string;

  if (config.provider === "local") {
    providerName = config.localProvider;
    // ユーザーがモデル名を設定している場合はそれを優先表示
    if (config.localModel && config.localModel !== "default") {
      modelName = config.localModel;
    } else {
      // 未設定の場合、APIから実際のモデル名を取得
      const actualModelName = await AIService.getLocalModelName();
      modelName = actualModelName || config.localModel;
    }
  } else if (config.provider === "openai") {
    providerName = "OpenAI";
    modelName = config.model;
  } else if (config.provider === "anthropic") {
    providerName = "Anthropic";
    modelName = config.model;
  } else {
    providerName = config.provider;
    modelName = config.model;
  }

  // 組織データアクセスが有効か確認（システムレベル）
  const orgContextAvailable = await isOrgContextEnabled();

  // チュートリアルドキュメントが利用可能か確認
  const tutorialDocCount = await prisma.tutorialDocument.count({
    where: { isEnabled: true },
  });
  const tutorialDocsAvailable = tutorialDocCount > 0;

  // RAGバックエンドの利用可能性を確認（バックエンド起動中ならドキュメント0件でもtrue）
  const ragStatus = await isRagAvailable();

  // ユーザー個人のRAGドキュメント数を取得
  let userRagDocumentCount = 0;
  if (ragStatus.available) {
    userRagDocumentCount = await getUserRagDocumentCount(session.user.id);
  }

  return {
    available,
    provider: config.provider,
    providerName,
    modelName,
    orgContextAvailable,
    tutorialDocsAvailable,
    ragAvailable: ragStatus.available,
    ragDocumentCount: ragStatus.documentCount,
    userRagDocumentCount,
  };
});

/**
 * POST /api/ai/chat
 * AIチャットメッセージを送信
 */
export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { messages, systemPrompt } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw ApiError.badRequest("Messages are required");
  }

  // Validate message format
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      throw ApiError.badRequest("Invalid message format");
    }
    if (!["user", "assistant", "system"].includes(msg.role)) {
      throw ApiError.badRequest("Invalid message role");
    }
  }

  const response = await AIService.chat({
    messages,
    systemPrompt,
  });

  await AuditService.log({
    action: "AI_CHAT_MESSAGE",
    category: "MODULE",
    userId: session.user.id,
    details: { messageCount: messages.length, mode: "standard" },
  });

  return response;
});
