import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";
import { prisma } from "@/lib/prisma";

interface ConciergeRequest {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  year: number;
  month: number;
}

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateJa(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = WEEKDAYS_JA[date.getDay()];
  return `${m}/${d}(${w})`;
}

function formatTimeJa(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  personal: "プライベート",
  work: "仕事",
  meeting: "会議",
  visitor: "来客",
  trip: "出張",
  other: "その他",
};

// POST /api/calendar/concierge - AIコンシェルジュ
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
    // Fetch events and holidays for the target month (with 1-week buffer)
    const startDate = new Date(year, month - 1, -6);
    const endDate = new Date(year, month, 7);

    const [events, holidays] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          userId: session.user.id,
          OR: [
            { startTime: { gte: startDate, lte: endDate } },
            { endTime: { gte: startDate, lte: endDate } },
          ],
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.holiday.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    // Build structured schedule context with local dates
    const eventLines = events.map((ev, i) => {
      const start = new Date(ev.startTime);
      const end = new Date(ev.endTime);
      const dateStr = formatDateJa(start);
      const timeStr = ev.allDay
        ? "終日"
        : `${formatTimeJa(start)}〜${formatTimeJa(end)}`;
      const cat = CATEGORY_LABELS[ev.category] ?? ev.category;
      const parts = [`[${i + 1}] ${dateStr} ${timeStr}`, `タイトル:${ev.title}`, `分類:${cat}`];
      if (ev.location) parts.push(`場所:${ev.location}`);
      if (ev.description) parts.push(`備考:${ev.description}`);
      return `  ${parts.join(" / ")}`;
    });

    const holidayLines = holidays.map((h, i) => {
      const d = new Date(h.date);
      return `  [${i + 1}] ${formatDateJa(d)} ${h.name}`;
    });

    const now = new Date();

    // Calculate this week's range
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const scheduleContext = [
      `今日: ${formatDateJa(now)}`,
      `今週: ${formatDateJa(monday)}〜${formatDateJa(sunday)}`,
      "",
      `予定一覧（全${events.length}件。これ以外の予定は存在しません）:`,
      events.length > 0
        ? eventLines.join("\n")
        : "  予定は0件です。",
      "",
      `祝日一覧（全${holidays.length}件）:`,
      holidays.length > 0
        ? holidayLines.join("\n")
        : "  祝日は0件です。",
    ].join("\n");

    // Log for debugging
    console.log("[Concierge] Data sent to AI:", scheduleContext);

    // Build conversation input from history
    const conversationContext = history
      .slice(-10)
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");

    const input = conversationContext
      ? `${conversationContext}\nUser: ${message}`
      : `User: ${message}`;

    const systemPrompt = `あなたはスケジュールコンシェルジュです。

【絶対ルール — 違反厳禁】
- 下記の「予定一覧」と「祝日一覧」に記載された情報だけを使って回答すること
- 一覧に無い予定・イベントを絶対に作り出さないこと（これが最も重要）
- 推測・補完・パターン拡張は禁止（例:1日分の有休データから他の日にも有休があると推測しない）
- 「今週の予定」を聞かれたら、今週の期間内の日付に該当する予定だけを一覧から抽出して答えること

【回答方法】
- 予定がある場合: 一覧の番号[N]の内容をそのまま引用して回答
- 該当予定が0件の場合のみ「該当する予定はありません」と答える
- 「不備」「ダブルブッキング」→ 全予定の日時を比較し重複を分析。なければ「問題ありません」
- 簡潔に回答。日本語質問→日本語、英語→英語

【表示形式】
- 日付は **太字**、箇条書き (- )
- 絵文字: 🔵プライベート 🟢仕事 🟣会議 🟠来客 🔷出張 ⚪その他 🔴祝日

${scheduleContext}`;

    const result = await AIService.generate({
      input,
      systemPrompt,
      temperature: 0,
    });

    return NextResponse.json({ reply: result.output });
  } catch (error) {
    console.error("Concierge error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
