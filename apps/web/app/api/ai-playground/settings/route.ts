import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  urlValidationMessage,
  validateHttpUrl,
} from "@/lib/utils/url-validation";

const SETTINGS_KEYS = {
  LLM_CONFIG: "ai_playground_llm_config",
  SYSTEM_PROMPTS: "ai_playground_system_prompts",
  SEARCH_CONFIG: "ai_playground_search_config",
  RAG_CONFIG: "ai_playground_rag_config",
} as const;

const GLOBAL_AI_KEYS = [
  "ai_local_endpoint",
  "ai_local_provider",
  "ai_local_model",
] as const;

function deriveOpenAIBase(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  try {
    return `${new URL(trimmed).origin}/v1`;
  } catch {
    return trimmed;
  }
}

function mapLocalProvider(provider: string | undefined): string | undefined {
  if (!provider) return undefined;
  if (provider === "llama.cpp") return "llama-cpp";
  if (
    provider === "lm-studio" ||
    provider === "ollama" ||
    provider === "llama-cpp"
  )
    return provider;
  return undefined;
}

function applyPlaygroundLlmFallback(
  current: unknown,
  globals: Record<string, string | undefined>,
): unknown {
  const cfg: Record<string, unknown> =
    current && typeof current === "object"
      ? { ...(current as Record<string, unknown>) }
      : {};
  const endpoint = globals.ai_local_endpoint;
  const provider = mapLocalProvider(globals.ai_local_provider);
  const model = globals.ai_local_model;

  const hasProvider =
    typeof cfg.provider === "string" && (cfg.provider as string).length > 0;
  const hasBaseUrl =
    typeof cfg.baseUrl === "string" && (cfg.baseUrl as string).length > 0;
  const hasModel =
    typeof cfg.model === "string" && (cfg.model as string).length > 0;

  if (!hasProvider && provider) cfg.provider = provider;
  if (!hasBaseUrl && endpoint) cfg.baseUrl = deriveOpenAIBase(endpoint);
  if (!hasModel && model) cfg.model = model;

  return cfg.provider || cfg.baseUrl || cfg.model ? cfg : current;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            ...Object.values(SETTINGS_KEYS),
            "ai_enabled",
            ...GLOBAL_AI_KEYS,
          ],
        },
      },
    });

    const result: Record<string, unknown> = {};
    const globals: Record<string, string | undefined> = {};
    for (const setting of settings) {
      if ((GLOBAL_AI_KEYS as readonly string[]).includes(setting.key)) {
        globals[setting.key] = setting.value;
        continue;
      }
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch {
        result[setting.key] = setting.value;
      }
    }

    result[SETTINGS_KEYS.LLM_CONFIG] = applyPlaygroundLlmFallback(
      result[SETTINGS_KEYS.LLM_CONFIG],
      globals,
    );

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

    // ADMINのみ設定変更可能
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const validKeys = Object.values(SETTINGS_KEYS);
    const updates: Array<{ key: string; value: string }> = [];

    for (const [key, value] of Object.entries(body)) {
      if (!validKeys.includes(key as (typeof validKeys)[number])) continue;

      let normalized: unknown = value;
      if (
        (key === SETTINGS_KEYS.LLM_CONFIG ||
          key === SETTINGS_KEYS.RAG_CONFIG) &&
        value &&
        typeof value === "object"
      ) {
        const cfg = { ...(value as Record<string, unknown>) };
        if (typeof cfg.baseUrl === "string" && cfg.baseUrl.trim() !== "") {
          const result = validateHttpUrl(cfg.baseUrl);
          if (!result.ok) {
            return NextResponse.json(
              {
                error: `Invalid baseUrl in ${key}: ${urlValidationMessage(result.reason, "en")}`,
                errorJa: `${key} の URL が無効です: ${urlValidationMessage(result.reason, "ja")}`,
              },
              { status: 400 },
            );
          }
          cfg.baseUrl = result.url;
        }
        normalized = cfg;
      }

      updates.push({
        key,
        value:
          typeof normalized === "string"
            ? normalized
            : JSON.stringify(normalized),
      });
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
