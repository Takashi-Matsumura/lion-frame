/**
 * ローカルLLM プロバイダ
 *
 * llama.cpp、LM Studio、Ollama を使用したAI機能の実装
 */

import { DEFAULT_SYSTEM_PROMPTS } from "../constants";
import type {
  AIConfig,
  ChatMessage,
  ChatResponse,
  ConnectionTestResult,
  GenerateResponse,
  TranslateRequest,
  TranslateResponse,
} from "../types";

function getOpenAIBase(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  try {
    return `${new URL(trimmed).origin}/v1`;
  } catch {
    return trimmed;
  }
}

/**
 * OpenAI 互換 API のレスポンスから content を取り出し、空だった場合は
 * thinking モデル（reasoning_content を返すモデル）の打ち切りなど
 * 原因を含む専用エラーを投げる。
 *
 * thinking モデル（Gemma thinking, gpt-oss, DeepSeek-R1 等）は
 * `reasoning_content` に思考を出力したあと `max_tokens` を使い切ると
 * `content` 空 + `finish_reason="length"` で返ってくる。
 * Issue #51 参照。
 */
function extractOpenAICompatibleContent(
  data: unknown,
  context: { provider: string; model: string; maxTokens: number },
): string {
  const choice = (data as { choices?: Array<Record<string, unknown>> })
    ?.choices?.[0];
  const message = choice?.message as
    | { content?: unknown; reasoning_content?: unknown }
    | undefined;
  const content =
    typeof message?.content === "string" ? message.content.trim() : "";

  if (content) {
    return content;
  }

  const finishReason =
    typeof choice?.finish_reason === "string" ? choice.finish_reason : "";
  const usage = (data as { usage?: Record<string, unknown> })?.usage;
  const completionTokens =
    typeof usage?.completion_tokens === "number" ? usage.completion_tokens : 0;
  const reasoningContent =
    typeof message?.reasoning_content === "string"
      ? message.reasoning_content
      : "";
  const reasoningLen = reasoningContent.length;

  // thinking モデルが思考だけ出して max_tokens を使い切ったケース
  if (
    reasoningLen > 0 &&
    finishReason === "length" &&
    completionTokens >= context.maxTokens
  ) {
    throw new Error(
      `${context.provider} のモデル「${context.model}」は thinking/reasoning モデルのため、` +
        `思考の出力で max_tokens (${context.maxTokens}) を使い切り本文が返りませんでした` +
        ` (completion_tokens=${completionTokens}, reasoning_len=${reasoningLen}, finish_reason=length)。` +
        `対処: max_tokens を増やすか、thinking なしのモデルに切り替えてください。`,
    );
  }

  // length 切りだが reasoning は無い（普通のモデルでも token 不足）
  if (finishReason === "length" && completionTokens >= context.maxTokens) {
    throw new Error(
      `${context.provider} のモデル「${context.model}」が max_tokens (${context.maxTokens}) を使い切り` +
        ` 本文が返りませんでした (completion_tokens=${completionTokens}, finish_reason=length)。` +
        `対処: max_tokens を増やしてください。`,
    );
  }

  // それ以外（フィルタリングなど）
  throw new Error(
    `${context.provider} から本文が返りませんでした` +
      ` (finish_reason=${finishReason || "unknown"}, completion_tokens=${completionTokens}` +
      `${reasoningLen > 0 ? `, reasoning_len=${reasoningLen}` : ""}).`,
  );
}

function getOllamaBase(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

// ============================================
// 接続テスト
// ============================================

/**
 * ローカルLLMの接続テスト
 */
export async function testLocalConnection(
  config: AIConfig,
): Promise<ConnectionTestResult> {
  if (config.provider !== "local") {
    return {
      success: false,
      message: "Local LLM is not selected as provider",
    };
  }

  try {
    if (config.localProvider === "ollama") {
      const response = await fetch(
        `${getOllamaBase(config.localEndpoint)}/api/tags`,
        { method: "GET" },
      );
      if (response.ok) {
        return { success: true, message: "Ollama is running" };
      }
    } else {
      // OpenAI互換API (llama.cpp, LM Studio)
      const response = await fetch(
        `${getOpenAIBase(config.localEndpoint)}/models`,
        { method: "GET" },
      );
      if (response.ok) {
        return {
          success: true,
          message: `${config.localProvider} is running`,
        };
      }
    }
    return {
      success: false,
      message: "Server responded but health check failed",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Connection failed: ${message}` };
  }
}

/**
 * ローカルLLMの実際のモデル名を取得
 */
export async function getLocalModelName(
  config: AIConfig,
): Promise<string | null> {
  if (config.provider !== "local") {
    return null;
  }

  try {
    if (config.localProvider === "ollama") {
      return config.localModel;
    } else {
      // OpenAI互換API (llama.cpp, LM Studio)
      const response = await fetch(
        `${getOpenAIBase(config.localEndpoint)}/models`,
        { method: "GET" },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const rawModelName = data.data[0].id;
          return parseModelName(rawModelName);
        }
      }
    }
  } catch {
    // エラー時は null を返す
  }
  return null;
}

/**
 * モデル名をパースして短い表示名を取得
 */
function parseModelName(rawName: string): string {
  let name = rawName.split("/").pop() || rawName;
  name = name.replace(/\.gguf$/i, "");

  if (name.includes("_GGUF_")) {
    name = name.split("_GGUF_").pop() || name;
  }
  if (name.startsWith("GGUF_")) {
    name = name.substring(5);
  }

  const prefixPatterns = [
    /^bartowski_/i,
    /^thebloke_/i,
    /^lmstudio-community_/i,
    /^huggingface_/i,
  ];
  for (const pattern of prefixPatterns) {
    name = name.replace(pattern, "");
  }

  name = name.replace(/^google_/i, "");
  name = name.replace(/^meta_/i, "");
  name = name.replace(/^mistral_/i, "");

  return name;
}

// ============================================
// 翻訳
// ============================================

/**
 * ローカルLLMで翻訳
 */
export async function translateWithLocal(
  request: TranslateRequest,
  config: AIConfig,
): Promise<TranslateResponse> {
  const targetLang = request.targetLanguage === "ja" ? "Japanese" : "English";
  const sourceLang = request.sourceLanguage === "ja" ? "Japanese" : "English";

  if (config.localProvider === "ollama") {
    return translateWithOllama(request, config, sourceLang, targetLang);
  } else {
    return translateWithOpenAICompatible(
      request,
      config,
      sourceLang,
      targetLang,
    );
  }
}

/**
 * OpenAI互換APIで翻訳 (llama.cpp, LM Studio)
 */
async function translateWithOpenAICompatible(
  request: TranslateRequest,
  config: AIConfig,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateResponse> {
  const maxTokens = 1000;
  const response = await fetch(
    `${getOpenAIBase(config.localEndpoint)}/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.localModel || "default",
        messages: [
          {
            role: "system",
            content: DEFAULT_SYSTEM_PROMPTS.translate(sourceLang, targetLang),
          },
          {
            role: "user",
            content: request.text,
          },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Local LLM error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const translatedText = extractOpenAICompatibleContent(data, {
    provider: config.localProvider,
    model: config.localModel || "default",
    maxTokens,
  });

  return {
    translatedText,
    provider: "local",
    model: `${config.localProvider}/${config.localModel}`,
  };
}

/**
 * Ollama APIで翻訳
 */
async function translateWithOllama(
  request: TranslateRequest,
  config: AIConfig,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateResponse> {
  const response = await fetch(
    `${getOllamaBase(config.localEndpoint)}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.localModel || "llama3.2",
        messages: [
          {
            role: "system",
            content: DEFAULT_SYSTEM_PROMPTS.translate(sourceLang, targetLang),
          },
          {
            role: "user",
            content: request.text,
          },
        ],
        stream: false,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ollama error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const translatedText = data.message?.content?.trim();

  if (!translatedText) {
    throw new Error("No translation received from Ollama");
  }

  return {
    translatedText,
    provider: "local",
    model: `ollama/${config.localModel}`,
  };
}

// ============================================
// チャット
// ============================================

/**
 * ローカルLLMでチャット
 */
export async function chatWithLocal(
  messages: ChatMessage[],
  config: AIConfig,
): Promise<ChatResponse> {
  if (config.localProvider === "ollama") {
    return chatWithOllama(messages, config);
  } else {
    return chatWithOpenAICompatible(messages, config);
  }
}

/**
 * OpenAI互換APIでチャット (llama.cpp, LM Studio)
 */
async function chatWithOpenAICompatible(
  messages: ChatMessage[],
  config: AIConfig,
): Promise<ChatResponse> {
  const maxTokens = 2000;
  const response = await fetch(
    `${getOpenAIBase(config.localEndpoint)}/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.localModel || "default",
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Local LLM error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const message = extractOpenAICompatibleContent(data, {
    provider: config.localProvider,
    model: config.localModel || "default",
    maxTokens,
  });

  return {
    message,
    provider: "local",
    model: `${config.localProvider}/${config.localModel}`,
  };
}

/**
 * Ollama APIでチャット
 */
async function chatWithOllama(
  messages: ChatMessage[],
  config: AIConfig,
): Promise<ChatResponse> {
  const response = await fetch(
    `${getOllamaBase(config.localEndpoint)}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.localModel || "llama3.2",
        messages,
        stream: false,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ollama error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const message = data.message?.content?.trim();

  if (!message) {
    throw new Error("No response received from Ollama");
  }

  return {
    message,
    provider: "local",
    model: `ollama/${config.localModel}`,
  };
}

// ============================================
// 汎用生成
// ============================================

/**
 * ローカルLLMで汎用生成
 */
export async function generateWithLocal(
  messages: ChatMessage[],
  config: AIConfig,
  temperature: number,
  maxTokens: number,
): Promise<GenerateResponse> {
  if (config.localProvider === "ollama") {
    const response = await fetch(
      `${getOllamaBase(config.localEndpoint)}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.localModel || "llama3.2",
          messages,
          stream: false,
          options: { temperature },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ollama error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const output = data.message?.content?.trim();

    if (!output) {
      throw new Error("No response received from Ollama");
    }

    return {
      output,
      provider: "local",
      model: `ollama/${config.localModel}`,
    };
  }

  // llama.cpp, LM Studio (OpenAI互換)
  const response = await fetch(
    `${getOpenAIBase(config.localEndpoint)}/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.localModel || "default",
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Local LLM error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const output = extractOpenAICompatibleContent(data, {
    provider: config.localProvider,
    model: config.localModel || "default",
    maxTokens,
  });

  return {
    output,
    provider: "local",
    model: `${config.localProvider}/${config.localModel}`,
  };
}
