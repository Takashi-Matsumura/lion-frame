import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";
import {
  buildToolDescriptions,
  executeTool,
  formatDateJa,
  parseToolCalls,
  type ToolCall,
  type ToolContext,
} from "./tools";

interface ConciergeRequest {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  year: number;
  month: number;
}

// POST /api/calendar/concierge - AIコンシェルジュ（2ステップ方式）
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ConciergeRequest;
  const { message, history, year, month } = body;

  if (!message || typeof year !== "number" || typeof month !== "number") {
    return NextResponse.json(
      { error: "message, year, month are required" },
      { status: 400 },
    );
  }

  try {
    const now = new Date();
    const context: ToolContext = {
      userId: session.user.id,
      year,
      month,
      now,
    };

    // 今週の範囲を算出
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // 会話履歴を構築
    const conversationContext = history
      .slice(-10)
      .map(
        (msg) =>
          `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
      )
      .join("\n");

    const input = conversationContext
      ? `${conversationContext}\nUser: ${message}`
      : `User: ${message}`;

    // ================================================
    // Step 1: 意図分析 + ツール選択
    // ================================================
    const toolDescriptions = buildToolDescriptions();

    const step1Prompt = `あなたはスケジュールコンシェルジュのツール選択エージェントです。
ユーザの質問を分析し、回答に必要なデータを取得するためのツールを選択してください。

利用可能ツール:
${toolDescriptions}

以下のJSON形式のみで回答してください（説明文は不要）:
{"tool": "ツール名", "params": { ... }}

複数ツールが必要な場合:
[{"tool": "ツール名1", "params": { ... }}, {"tool": "ツール名2", "params": { ... }}]

今日: ${formatDateJa(now)}
今週: ${formatDateJa(monday)}〜${formatDateJa(sunday)}
表示中の月: ${year}年${month}月`;

    const step1Result = await AIService.generate({
      input,
      systemPrompt: step1Prompt,
      temperature: 0,
    });

    console.log(
      "[Concierge] Step 1 tool selection:",
      step1Result.output,
    );

    // Step 1 の出力をパースしてツール実行
    let toolCalls: ToolCall[];
    try {
      toolCalls = parseToolCalls(step1Result.output);
    } catch {
      console.warn(
        "[Concierge] Step 1 parse failed, using default get_events(this_month)",
      );
      toolCalls = [{ tool: "get_events", params: { period: "this_month" } }];
    }

    // ================================================
    // ツール実行
    // ================================================
    const toolResults: string[] = [];

    for (const call of toolCalls) {
      try {
        const result = await executeTool(call, context);
        console.log(
          `[Concierge] Tool result (${call.tool}):`,
          result.slice(0, 200),
        );
        toolResults.push(`【${call.tool}の結果】\n${result}`);
      } catch (error) {
        console.error(`[Concierge] Tool error (${call.tool}):`, error);
        toolResults.push(
          `【${call.tool}の結果】\nデータ取得エラーが発生しました。`,
        );
      }
    }

    const combinedResults = toolResults.join("\n\n");

    // ================================================
    // Step 2: データに基づく回答生成
    // ================================================
    const step2Prompt = `あなたはスケジュールコンシェルジュです。

【絶対ルール】
- 下記の「取得データ」に記載された情報だけを使って回答すること
- データに無い予定を絶対に作り出さないこと
- 推測・補完・パターン拡張は禁止

【表示形式】
- 日付は **太字**、箇条書き (- )
- 絵文字: 🔵プライベート 🟢仕事 🟣会議 🟠来客 🔷出張 ⚪その他 🔴祝日
- 簡潔に回答。日本語質問→日本語、英語→英語

取得データ:
${combinedResults}`;

    const step2Result = await AIService.generate({
      input,
      systemPrompt: step2Prompt,
      temperature: 0,
    });

    return NextResponse.json({ reply: step2Result.output });
  } catch (error) {
    console.error("Concierge error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
