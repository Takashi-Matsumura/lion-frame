import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { AIService, type ChatMessage } from "@/lib/core-modules/ai";
import { getMenuByPath, getTabsByMenuPath } from "@/lib/modules/registry";
import { prisma } from "@/lib/prisma";

function buildSystemPrompt(
  language: string,
  pageTitle: string,
  path: string,
  moduleName: string,
  menuGroup: string,
  tabNames: string[],
): string {
  if (language === "ja") {
    return `あなたはLionFrameアプリケーションのページガイドを生成するアシスタントです。
以下のページ情報に基づいて、このページの使い方を簡潔に説明してください。

フォーマット:
## このページでできること
- （箇条書きで主な機能を3〜5個）

## ヒント
- （便利な使い方やTipsを2〜3個）

ページ情報:
- ページ名: ${pageTitle}
- パス: ${path}
- モジュール: ${moduleName}
- 対象ユーザ: ${menuGroup}${tabNames.length > 0 ? `\n- タブ: ${tabNames.join(", ")}` : ""}`;
  }

  return `You are an assistant that generates page guides for the LionFrame application.
Based on the following page information, provide a concise guide on how to use this page.

Format:
## What you can do on this page
- (List 3-5 main features in bullet points)

## Tips
- (2-3 helpful tips)

Page information:
- Page name: ${pageTitle}
- Path: ${path}
- Module: ${moduleName}
- Target users: ${menuGroup}${tabNames.length > 0 ? `\n- Tabs: ${tabNames.join(", ")}` : ""}`;
}

/**
 * POST /api/page-guide/stream
 * ページガイドをLLMでストリーミング生成し、完了後にDBキャッシュ
 */
export async function POST(request: Request) {
  try {
    await requireAuth();

    const body = await request.json();
    const { path, language = "ja" } = body;

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const config = await AIService.getConfig();

    if (!config.enabled) {
      return NextResponse.json(
        { error: "AI is not enabled" },
        { status: 400 },
      );
    }

    // モジュールレジストリからページメタデータを取得
    const menu = getMenuByPath(path);
    const pageTitle = menu
      ? language === "ja"
        ? menu.nameJa
        : menu.name
      : path;
    const moduleName = menu?.moduleId || "unknown";
    const menuGroup = menu?.menuGroup || "user";

    // タブ情報を取得
    const tabs = getTabsByMenuPath(path);
    const tabNames =
      tabs?.map((tab) => (language === "ja" ? tab.nameJa : tab.name)) || [];

    const systemPrompt = buildSystemPrompt(
      language,
      pageTitle,
      path,
      moduleName,
      menuGroup,
      tabNames,
    );

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          language === "ja"
            ? "このページのガイドを生成してください。"
            : "Please generate a guide for this page.",
      },
    ];

    // ストリーミングレスポンスを作成
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendChunk = (content: string) => {
          fullContent += content;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
          );
        };

        const sendDone = () => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
          );
        };

        try {
          await streamWithConfig(config, messages, sendChunk, sendDone);

          // 完了後にDBにキャッシュ保存
          if (fullContent.trim()) {
            // 既存ガイドがあればリビジョンに退避
            const existing = await prisma.pageGuide.findUnique({
              where: { path_language: { path, language } },
            });

            if (existing) {
              await prisma.pageGuideRevision.create({
                data: {
                  guideId: existing.id,
                  content: existing.content,
                  version: existing.version,
                  editedBy: existing.editedBy,
                  editedByName: existing.editedByName,
                },
              });

              await prisma.pageGuide.update({
                where: { id: existing.id },
                data: {
                  content: fullContent,
                  version: existing.version + 1,
                  editedBy: null,
                  editedByName: null,
                  generatedAt: new Date(),
                },
              });
            } else {
              await prisma.pageGuide.create({
                data: { path, language, content: fullContent },
              });
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Streaming failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
          );
        } finally {
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
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error in page guide stream:", error);
    return NextResponse.json(
      { error: "Failed to generate page guide" },
      { status: 500 },
    );
  }
}

/**
 * AI設定に基づいてストリーミングチャットを実行
 * 既存の /api/ai/chat/stream/route.ts のパターンを再利用
 */
async function streamWithConfig(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  sendChunk: (content: string) => void,
  sendDone: () => void,
) {
  if (config.provider === "local") {
    if (config.localProvider === "ollama") {
      await streamOllama(config, messages, sendChunk, sendDone);
    } else {
      await streamOpenAICompatible(config, messages, sendChunk, sendDone);
    }
  } else if (config.provider === "openai") {
    await streamOpenAI(config, messages, sendChunk, sendDone);
  } else if (config.provider === "anthropic") {
    await streamAnthropic(config, messages, sendChunk, sendDone);
  }
}

async function streamOpenAI(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  sendChunk: (content: string) => void,
  sendDone: () => void,
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  await processSSEStream(response, sendChunk, sendDone, "openai");
}

async function streamAnthropic(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  sendChunk: (content: string) => void,
  sendDone: () => void,
) {
  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-3-haiku-20240307",
      max_tokens: 2000,
      system: systemMessage?.content,
      messages: chatMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  await processSSEStream(response, sendChunk, sendDone, "anthropic");
}

async function streamOpenAICompatible(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  sendChunk: (content: string) => void,
  sendDone: () => void,
) {
  const response = await fetch(config.localEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.localModel || "default",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Local LLM error: ${response.status}`);
  }

  await processSSEStream(response, sendChunk, sendDone, "openai");
}

async function streamOllama(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  sendChunk: (content: string) => void,
  sendDone: () => void,
) {
  const response = await fetch(config.localEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.localModel || "llama3.2",
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
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
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          sendChunk(data.message.content);
        }
        if (data.done) {
          sendDone();
          return;
        }
      } catch {
        // パースエラーは無視
      }
    }
  }

  sendDone();
}

async function processSSEStream(
  response: Response,
  sendChunk: (content: string) => void,
  sendDone: () => void,
  format: "openai" | "anthropic",
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);

      if (data === "[DONE]") {
        sendDone();
        return;
      }

      try {
        const parsed = JSON.parse(data);

        if (format === "openai") {
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            sendChunk(content);
          }
        } else if (format === "anthropic") {
          if (parsed.type === "content_block_delta") {
            const content = parsed.delta?.text;
            if (content) {
              sendChunk(content);
            }
          } else if (parsed.type === "message_stop") {
            sendDone();
            return;
          }
        }
      } catch {
        // パースエラーは無視
      }
    }
  }

  sendDone();
}
