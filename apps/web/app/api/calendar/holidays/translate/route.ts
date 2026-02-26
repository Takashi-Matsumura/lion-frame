import { apiHandler, ApiError } from "@/lib/api";
import { AIService } from "@/lib/core-modules/ai";

// POST /api/calendar/holidays/translate - AIで祝日名を英訳
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { name } = body as { name: string };

  if (!name || typeof name !== "string") {
    throw ApiError.badRequest("name is required");
  }

  const input = `Translate the following Japanese holiday name to English.
Return ONLY the English name as plain text, no quotes, no explanation.

Japanese name: ${name}`;

  const systemPrompt =
    "You are a helpful assistant that translates Japanese holiday names to their official English names. Use standard/official English names where they exist. Return only the translated name as plain text.";

  const result = await AIService.generate({
    input,
    systemPrompt,
    temperature: 0.1,
  });

  const nameEn = result.output.trim().replace(/^["']|["']$/g, "");

  return { nameEn };
}, { admin: true });
