import { ApiError, apiHandler } from "@/lib/api";
import { AIService } from "@/lib/core-modules/ai";

/**
 * POST /api/ai/services/generate
 *
 * 汎用テキスト生成API（外部モジュール向け）
 *
 * カスタムプロンプトを使用してAIでテキストを生成します。
 * 他のモジュールから呼び出して、様々なAIタスクに利用できます。
 *
 * @example リクエスト
 * ```json
 * {
 *   "input": "売上データ: 1月100万円、2月150万円、3月120万円",
 *   "systemPrompt": "あなたはビジネスアナリストです。データを分析してください。",
 *   "temperature": 0.5,
 *   "maxTokens": 1000
 * }
 * ```
 *
 * @example レスポンス
 * ```json
 * {
 *   "output": "売上分析結果...",
 *   "provider": "local",
 *   "model": "llama.cpp/gemma-3n"
 * }
 * ```
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { input, systemPrompt, temperature, maxTokens } = body;

  // バリデーション
  if (!input || typeof input !== "string") {
    throw ApiError.badRequest("input is required and must be a string");
  }

  if (!systemPrompt || typeof systemPrompt !== "string") {
    throw ApiError.badRequest(
      "systemPrompt is required and must be a string",
    );
  }

  if (
    temperature !== undefined &&
    (typeof temperature !== "number" || temperature < 0 || temperature > 2)
  ) {
    throw ApiError.badRequest(
      "temperature must be a number between 0 and 2",
    );
  }

  if (
    maxTokens !== undefined &&
    (typeof maxTokens !== "number" || maxTokens < 1 || maxTokens > 10000)
  ) {
    throw ApiError.badRequest(
      "maxTokens must be a number between 1 and 10000",
    );
  }

  const response = await AIService.generate({
    input,
    systemPrompt,
    temperature,
    maxTokens,
  });

  return response;
});
