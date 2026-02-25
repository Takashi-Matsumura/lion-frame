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
    const startDate = new Date(year, month - 1, -6); // 1 week before month start
    const endDate = new Date(year, month, 7); // 1 week after month end

    const [events, holidays] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          userId: session.user.id,
          startTime: { gte: startDate },
          endTime: { lte: endDate },
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

    // Build schedule context
    const eventLines = events.map((ev) => {
      const start = ev.startTime.toISOString();
      const end = ev.endTime.toISOString();
      const allDay = ev.allDay ? " (all day)" : "";
      return `- ${start} ~ ${end}${allDay}: ${ev.title} [${ev.category}]${ev.location ? ` @${ev.location}` : ""}${ev.description ? ` - ${ev.description}` : ""}`;
    });

    const holidayLines = holidays.map((h) => {
      return `- ${h.date.toISOString().split("T")[0]}: ${h.name}${h.nameEn ? ` (${h.nameEn})` : ""} [${h.type}]`;
    });

    const scheduleContext = [
      `Current date: ${new Date().toISOString().split("T")[0]}`,
      `Viewing: ${year}-${String(month).padStart(2, "0")}`,
      "",
      `Events (${events.length}):`,
      eventLines.length > 0 ? eventLines.join("\n") : "(no events)",
      "",
      `Holidays (${holidays.length}):`,
      holidayLines.length > 0 ? holidayLines.join("\n") : "(no holidays)",
    ].join("\n");

    // Build conversation input from history
    const conversationContext = history
      .slice(-10) // Keep last 10 messages for context
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");

    const input = conversationContext
      ? `${conversationContext}\nUser: ${message}`
      : `User: ${message}`;

    const systemPrompt = `You are a helpful AI schedule concierge. Answer questions about the user's schedule based on the following data.
Respond concisely and naturally. If the user asks in Japanese, respond in Japanese. If in English, respond in English.

When listing schedules or events, use Markdown formatting for readability:
- Use **bold** for dates (e.g. **2/25(水)**)
- Use bullet lists (- ) to separate each event
- Include time, title, and category on each line
- Use 🔴 for holidays, 🔵 for personal, 🟢 for work, 🟣 for meetings, 🟠 for visitors

${scheduleContext}`;

    const result = await AIService.generate({
      input,
      systemPrompt,
      temperature: 0.3,
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
