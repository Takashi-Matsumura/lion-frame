import { ApiError, apiHandler } from "@/lib/api";
import { AIService } from "@/lib/core-modules/ai";

/**
 * POST /api/ai/services/summarize
 *
 * テキスト要約API（外部モジュール向け）
 *
 * テキストを要約します。要約の長さと出力言語を指定できます。
 *
 * @example リクエスト
 * ```json
 * {
 *   "text": "長い議事録テキスト...",
 *   "length": "short",
 *   "language": "ja"
 * }
 * ```
 *
 * @example レスポンス
 * ```json
 * {
 *   "summary": "要約されたテキスト...",
 *   "provider": "local",
 *   "model": "llama.cpp/gemma-3n"
 * }
 * ```
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { text, length, language } = body;

  // バリデーション
  if (!text || typeof text !== "string") {
    throw ApiError.badRequest("text is required and must be a string");
  }

  if (length !== undefined && !["short", "medium", "long"].includes(length)) {
    throw ApiError.badRequest("length must be 'short', 'medium', or 'long'");
  }

  if (language !== undefined && !["ja", "en"].includes(language)) {
    throw ApiError.badRequest("language must be 'ja' or 'en'");
  }

  const response = await AIService.summarize({
    text,
    length,
    language,
  });

  return response;
});
