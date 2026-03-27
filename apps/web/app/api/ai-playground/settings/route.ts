import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SETTINGS_KEYS = {
  LLM_CONFIG: "ai_playground_llm_config",
  SYSTEM_PROMPTS: "ai_playground_system_prompts",
  SEARCH_CONFIG: "ai_playground_search_config",
  RAG_CONFIG: "ai_playground_rag_config",
} as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: Object.values(SETTINGS_KEYS) },
      },
    });

    const result: Record<string, unknown> = {};
    for (const setting of settings) {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch {
        result[setting.key] = setting.value;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // MANAGER以上のみ設定変更可能
    const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const validKeys = Object.values(SETTINGS_KEYS);
    const updates: Array<{ key: string; value: string }> = [];

    for (const [key, value] of Object.entries(body)) {
      if (validKeys.includes(key as (typeof validKeys)[number])) {
        updates.push({
          key,
          value: typeof value === "string" ? value : JSON.stringify(value),
        });
      }
    }

    for (const update of updates) {
      await prisma.systemSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
