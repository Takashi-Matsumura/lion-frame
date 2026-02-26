import { ApiError, apiHandler } from "@/lib/api";
import { AIService, type ExtractField } from "@/lib/core-modules/ai";

/**
 * POST /api/ai/services/extract
 *
 * データ抽出API（外部モジュール向け）
 *
 * テキストから構造化データを抽出します。
 * 抽出するフィールドのスキーマを指定して、JSON形式でデータを取得できます。
 *
 * @example リクエスト
 * ```json
 * {
 *   "text": "田中太郎さん（35歳）は東京都在住で、エンジニアとして働いています。",
 *   "schema": [
 *     { "name": "name", "description": "人物の名前", "type": "string", "required": true },
 *     { "name": "age", "description": "年齢", "type": "number" },
 *     { "name": "location", "description": "居住地", "type": "string" },
 *     { "name": "occupation", "description": "職業", "type": "string" }
 *   ],
 *   "language": "ja"
 * }
 * ```
 *
 * @example レスポンス
 * ```json
 * {
 *   "data": {
 *     "name": "田中太郎",
 *     "age": 35,
 *     "location": "東京都",
 *     "occupation": "エンジニア"
 *   },
 *   "provider": "local",
 *   "model": "llama.cpp/gemma-3n"
 * }
 * ```
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { text, schema, language } = body;

  // バリデーション
  if (!text || typeof text !== "string") {
    throw ApiError.badRequest("text is required and must be a string");
  }

  if (!schema || !Array.isArray(schema) || schema.length === 0) {
    throw ApiError.badRequest(
      "schema is required and must be a non-empty array",
    );
  }

  // スキーマフィールドのバリデーション
  const validTypes = ["string", "number", "boolean", "array"];
  for (const field of schema as ExtractField[]) {
    if (!field.name || typeof field.name !== "string") {
      throw ApiError.badRequest(
        "Each schema field must have a 'name' string",
      );
    }
    if (!field.description || typeof field.description !== "string") {
      throw ApiError.badRequest(
        "Each schema field must have a 'description' string",
      );
    }
    if (!field.type || !validTypes.includes(field.type)) {
      throw ApiError.badRequest(
        `Each schema field must have a 'type' of: ${validTypes.join(", ")}`,
      );
    }
  }

  if (language !== undefined && !["ja", "en"].includes(language)) {
    throw ApiError.badRequest("language must be 'ja' or 'en'");
  }

  const response = await AIService.extract({
    text,
    schema,
    language,
  });

  return response;
});
