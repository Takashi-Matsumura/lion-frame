import { apiHandler, ApiError } from "@/lib/api";
import { AIService } from "@/lib/core-modules/ai";

// POST /api/tags/translate - AIでタグ名を英訳
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { name } = body as { name: string };

  if (!name || typeof name !== "string") {
    throw ApiError.badRequest("name is required");
  }

  const input = `Translate the following Japanese tag name to English.
Return ONLY the English tag name as plain text, no quotes, no explanation.
Use lowercase with hyphens for multi-word tags (e.g. "project-plan", "meeting-notes").

Japanese tag name: ${name}`;

  const systemPrompt =
    "You are a helpful assistant that translates Japanese tag names to concise English equivalents. Use lowercase with hyphens for multi-word tags. Return only the translated name as plain text.";

  const result = await AIService.generate({
    input,
    systemPrompt,
    temperature: 0.1,
  });

  const nameEn = result.output.trim().replace(/^["']|["']$/g, "");

  return { nameEn };
}, { admin: true });
