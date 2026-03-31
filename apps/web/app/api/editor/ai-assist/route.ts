import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { AIService, type ChatMessage } from "@/lib/core-modules/ai";
import { AuditService } from "@/lib/services/audit-service";

type EditorAction =
  | "proofread"
  | "rewrite"
  | "to-markdown"
  | "summarize"
  | "continue"
  | "proofread-all"
  | "summarize-all"
  | "suggest-structure"
  | "freeform";

const ACTION_SYSTEM_PROMPTS: Record<Exclude<EditorAction, "freeform">, string> = {
  proofread:
    "あなたはプロの校正者です。ユーザーが選択したテキストの誤字脱字・文法ミス・不自然な表現を修正してください。修正後のテキストのみを返してください。説明は不要です。マークダウン記法はそのまま維持してください。",
  rewrite:
    "あなたはプロのライターです。ユーザーが選択したテキストを、より明確・簡潔・読みやすく書き換えてください。書き換え後のテキストのみを返してください。マークダウン記法はそのまま維持してください。",
  "to-markdown":
    "あなたはマークダウンの専門家です。ユーザーが選択したテキストを適切なマークダウン記法に変換してください。見出し・箇条書き・テーブル・コードブロックなど、内容に最適な記法を使ってください。変換後のマークダウンのみを返してください。",
  summarize:
    "あなたは要約の専門家です。ユーザーが選択したテキストを簡潔に要約してください。要約のみを返してください。",
  continue:
    "あなたはプロのライターです。ユーザーが選択したテキストの続きを、同じ文体・トーン・マークダウン記法で自然に書いてください。続きのテキストのみを返してください。",
  "proofread-all":
    "あなたはプロの校正者です。以下のドキュメント全体の誤字脱字・文法ミス・不自然な表現を修正してください。修正後のドキュメント全体を返してください。マークダウン記法はそのまま維持してください。",
  "summarize-all":
    "あなたは要約の専門家です。以下のドキュメント全体を簡潔に要約してください。要約のみを返してください。",
  "suggest-structure":
    "あなたはドキュメント構成の専門家です。以下のドキュメントの見出し構成を分析し、改善案を提案してください。現在の構成と提案する構成をマークダウンの見出しリストで示してください。",
};

/**
 * POST /api/editor/ai-assist
 * エディタAIアシスト（ストリーミング）
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { action, selectedText, documentContent, userMessage } = body as {
      action: EditorAction;
      selectedText?: string;
      documentContent: string;
      userMessage?: string;
    };

    if (!action || !documentContent) {
      return NextResponse.json(
        { error: "action and documentContent are required" },
        { status: 400 },
      );
    }

    const config = await AIService.getConfig();
    if (!config.enabled) {
      return NextResponse.json({ error: "AI is not enabled" }, { status: 400 });
    }

    // システムプロンプトの構築
    let systemPrompt: string;
    if (action === "freeform") {
      systemPrompt =
        "あなたはマークダウンエディタのAIアシスタントです。ユーザーのドキュメント内容を踏まえて、質問や指示に回答してください。マークダウンの記法で回答し、必要に応じてドキュメントの改善提案を行ってください。";
    } else {
      systemPrompt = ACTION_SYSTEM_PROMPTS[action];
    }

    // ドキュメントコンテキストをシステムプロンプトに追加
    // コンテキストサイズ超過を防ぐため、ドキュメントが長い場合は切り詰める
    // 日本語は1文字≒1-2トークン。安全側で文字数ベースの制限を適用
    const MAX_DOC_CHARS = 6000;
    const trimmedDoc =
      documentContent.length > MAX_DOC_CHARS
        ? documentContent.slice(0, MAX_DOC_CHARS) + "\n\n...（ドキュメントが長いため省略）"
        : documentContent;
    systemPrompt += `\n\n--- ドキュメント全文 ---\n${trimmedDoc}\n--- ドキュメントここまで ---`;

    // ユーザーメッセージの構築
    let userContent: string;
    if (action === "freeform") {
      userContent = userMessage || "";
    } else if (selectedText) {
      userContent = `以下の選択テキストに対して処理してください:\n\n${selectedText}`;
    } else {
      userContent = "ドキュメント全体に対して処理してください。";
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    await AuditService.log({
      action: "EDITOR_AI_ASSIST",
      category: "MODULE",
      userId: session.user.id,
      details: { action, hasSelection: !!selectedText },
    });

    // ストリーミングレスポンス
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendChunk = (content: string) => {
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
          await streamToProvider(config, messages, sendChunk, sendDone);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Streaming failed";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`,
            ),
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
    console.error("Error in editor AI assist:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 },
    );
  }
}

// ストリーミング実行（プロバイダ振り分け）
async function streamToProvider(
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
      temperature: 0.4,
      max_tokens: 2000,
      stream: true,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
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
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

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
  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
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
      temperature: 0.4,
      max_tokens: 2000,
      stream: true,
    }),
  });
  if (!response.ok) throw new Error(`Local LLM error: ${response.status}`);
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
  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

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
        if (data.message?.content) sendChunk(data.message.content);
        if (data.done) { sendDone(); return; }
      } catch { /* ignore parse errors */ }
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
      if (data === "[DONE]") { sendDone(); return; }

      try {
        const parsed = JSON.parse(data);
        if (format === "openai") {
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) sendChunk(content);
        } else if (format === "anthropic") {
          if (parsed.type === "content_block_delta") {
            const content = parsed.delta?.text;
            if (content) sendChunk(content);
          } else if (parsed.type === "message_stop") {
            sendDone();
            return;
          }
        }
      } catch { /* ignore parse errors */ }
    }
  }
  sendDone();
}
