import { NextRequest } from "next/server";
import type { LLMConfig, LLMGenerateOptions, ChatRequest, ChatMode, SearchResult, RAGContext, SystemPrompts } from "@lionframe/addon-ai-playground";
import {
  getSystemPrompt as getPrompt,
  buildExplainPrompt,
  buildIdeaPrompt,
  buildSearchPrompt,
  buildRAGPrompt,
} from "@lionframe/addon-ai-playground/src/prompts";

// --- Inline LLM Provider (server-only) ---

function getHeaders(config: LLMConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  return headers;
}

async function* streamLLM(
  config: LLMConfig,
  prompt: string,
  options?: LLMGenerateOptions,
): AsyncGenerator<string, void, unknown> {
  const messages: Array<{ role: string; content: string }> = [];
  if (options?.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  if (options?.history && options.history.length > 0) {
    for (const msg of options.history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: getHeaders(config),
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? -1,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta;
        const content = delta?.content;
        const reasoning = delta?.reasoning;

        if (reasoning) {
          yield `<think>${reasoning}</think>`;
        }
        if (content) {
          yield content;
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }
}

// --- Prompt Helpers ---

function buildPrompt(mode: ChatMode, message: string, searchResults?: SearchResult[], ragContext?: RAGContext[]): string {
  switch (mode) {
    case "explain":
      return buildExplainPrompt(message);
    case "idea":
      return buildIdeaPrompt(message);
    case "search":
      return buildSearchPrompt(message, searchResults || []);
    case "rag":
      return buildRAGPrompt(message, ragContext || []);
    default:
      return message;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, mode, llmConfig, searchResults, ragContext, history, systemPrompts } =
      body as ChatRequest;

    if (!message || !llmConfig) {
      return new Response(
        JSON.stringify({ error: "必要なパラメータが不足しています" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    let systemPrompt: string | undefined;
    let userPrompt: string;

    if (mode === null) {
      systemPrompt = undefined;
      userPrompt = message;
    } else {
      systemPrompt = getPrompt(mode, systemPrompts);
      if (mode === "search" && (!searchResults || searchResults.length === 0)) {
        return new Response(
          JSON.stringify({ error: "検索結果がありません" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      userPrompt = buildPrompt(mode, message, searchResults, ragContext);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamLLM(llmConfig, userPrompt, {
            systemPrompt,
            history,
          });

          for await (const chunk of generator) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`),
            );
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `サーバーエラー: ${msg}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
