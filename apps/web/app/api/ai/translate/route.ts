import { ApiError, apiHandler } from "@/lib/api";
import { AIService } from "@/lib/core-modules/ai";

/**
 * POST /api/ai/translate
 * テキストを翻訳（認証済みユーザーのみ）
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { text, sourceLanguage, targetLanguage } = body;

  if (!text || !sourceLanguage || !targetLanguage) {
    throw ApiError.badRequest(
      "text, sourceLanguage, and targetLanguage are required",
    );
  }

  if (
    !["ja", "en"].includes(sourceLanguage) ||
    !["ja", "en"].includes(targetLanguage)
  ) {
    throw ApiError.badRequest(
      "sourceLanguage and targetLanguage must be 'ja' or 'en'",
    );
  }

  if (sourceLanguage === targetLanguage) {
    return {
      translatedText: text,
      provider: "none",
      model: "none",
    };
  }

  const result = await AIService.translate({
    text,
    sourceLanguage,
    targetLanguage,
  });

  return result;
});

/**
 * GET /api/ai/translate
 * AI翻訳が利用可能かどうかをチェック
 */
export const GET = apiHandler(async () => {
  const available = await AIService.isAvailable();
  return { available };
});
