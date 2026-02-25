import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";

// POST /api/calendar/holidays/translate - AIで祝日名を英訳
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body as { name: string };

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  try {
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

    return NextResponse.json({ nameEn });
  } catch (error) {
    console.error("Failed to translate holiday name:", error);
    return NextResponse.json(
      { error: "Failed to translate" },
      { status: 500 },
    );
  }
}
