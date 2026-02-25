/**
 * AIコンシェルジュ ツール定義
 *
 * 2ステップAPI選択アーキテクチャ用のツール定義と実行関数。
 * Step 1 でAIが選択し、サーバ側で実行してデータを取得する。
 */

import { prisma } from "@/lib/prisma";

// ============================================
// 共有ユーティリティ（route.ts でも使用）
// ============================================

export const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDateJa(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = WEEKDAYS_JA[date.getDay()];
  return `${m}/${d}(${w})`;
}

export function formatTimeJa(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  personal: "休暇",
  work: "仕事",
  meeting: "会議",
  visitor: "来客",
  trip: "出張",
  other: "その他",
};

// ============================================
// ツール型定義
// ============================================

export interface ToolContext {
  userId: string;
  year: number;
  month: number;
  now: Date;
}

export interface ConciergeTool {
  name: string;
  description: string;
  parameters: Record<
    string,
    { type: string; description: string; enum?: string[] }
  >;
  execute: (
    params: Record<string, string>,
    context: ToolContext,
  ) => Promise<string>;
}

export interface ToolCall {
  tool: string;
  params: Record<string, string>;
}

// ============================================
// 期間解決ヘルパー
// ============================================

function resolvePeriod(
  period: string,
  context: ToolContext,
  customStart?: string,
  customEnd?: string,
): { startDate: Date; endDate: Date; label: string } {
  const { now, year, month } = context;

  switch (period) {
    case "today": {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      return { startDate: start, endDate: end, label: `${formatDateJa(now)}` };
    }
    case "this_week": {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return {
        startDate: monday,
        endDate: sunday,
        label: `${formatDateJa(monday)}〜${formatDateJa(sunday)}`,
      };
    }
    case "next_week": {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() + mondayOffset);
      const nextMonday = new Date(thisMonday);
      nextMonday.setDate(thisMonday.getDate() + 7);
      nextMonday.setHours(0, 0, 0, 0);
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      nextSunday.setHours(23, 59, 59, 999);
      return {
        startDate: nextMonday,
        endDate: nextSunday,
        label: `${formatDateJa(nextMonday)}〜${formatDateJa(nextSunday)}`,
      };
    }
    case "custom": {
      if (customStart && customEnd) {
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        return {
          startDate: start,
          endDate: end,
          label: `${formatDateJa(start)}〜${formatDateJa(end)}`,
        };
      }
      // fallthrough to this_month
    }
    // eslint-disable-next-line no-fallthrough
    case "this_month":
    default: {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return {
        startDate: start,
        endDate: end,
        label: `${year}年${month}月`,
      };
    }
  }
}

// ============================================
// イベント行フォーマット
// ============================================

function formatEventLine(
  ev: {
    startTime: Date;
    endTime: Date;
    allDay: boolean;
    title: string;
    category: string;
    location: string | null;
    description: string | null;
  },
  index: number,
): string {
  const start = new Date(ev.startTime);
  const end = new Date(ev.endTime);
  const dateStr = formatDateJa(start);
  const timeStr = ev.allDay
    ? "終日"
    : `${formatTimeJa(start)}〜${formatTimeJa(end)}`;
  const cat = CATEGORY_LABELS[ev.category] ?? ev.category;
  const parts = [
    `[${index + 1}] ${dateStr} ${timeStr}`,
    `タイトル:${ev.title}`,
    `分類:${cat}`,
  ];
  if (ev.location) parts.push(`場所:${ev.location}`);
  if (ev.description) parts.push(`備考:${ev.description}`);
  return parts.join(" / ");
}

// ============================================
// ツール定義
// ============================================

const getEvents: ConciergeTool = {
  name: "get_events",
  description:
    "指定期間内のユーザの予定を取得する。期間やカテゴリで絞り込み可能。",
  parameters: {
    period: {
      type: "string",
      description: "取得期間",
      enum: [
        "today",
        "this_week",
        "next_week",
        "this_month",
        "custom",
      ],
    },
    startDate: {
      type: "string",
      description: "custom期間の開始日 (YYYY-MM-DD)。periodがcustomの場合のみ使用",
    },
    endDate: {
      type: "string",
      description: "custom期間の終了日 (YYYY-MM-DD)。periodがcustomの場合のみ使用",
    },
    category: {
      type: "string",
      description: "カテゴリで絞り込む場合に指定",
      enum: ["personal", "work", "meeting", "visitor", "trip", "other"],
    },
  },
  execute: async (params, context) => {
    const { startDate, endDate, label } = resolvePeriod(
      params.period || "this_month",
      context,
      params.startDate,
      params.endDate,
    );

    const where: Record<string, unknown> = {
      userId: context.userId,
      OR: [
        { startTime: { gte: startDate, lte: endDate } },
        { endTime: { gte: startDate, lte: endDate } },
      ],
    };
    if (params.category) {
      where.category = params.category;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: "asc" },
    });

    const categoryLabel = params.category
      ? ` (${CATEGORY_LABELS[params.category] || params.category})`
      : "";

    if (events.length === 0) {
      return `期間: ${label}${categoryLabel}\n該当予定: 0件\n\nこの期間に予定はありません。`;
    }

    const lines = events.map((ev, i) => formatEventLine(ev, i));
    return `期間: ${label}${categoryLabel}\n該当予定: ${events.length}件\n\n${lines.join("\n")}`;
  },
};

const getHolidays: ConciergeTool = {
  name: "get_holidays",
  description: "指定期間内の祝日を取得する。",
  parameters: {
    period: {
      type: "string",
      description: "取得期間",
      enum: [
        "today",
        "this_week",
        "next_week",
        "this_month",
        "custom",
      ],
    },
    startDate: {
      type: "string",
      description: "custom期間の開始日 (YYYY-MM-DD)。periodがcustomの場合のみ使用",
    },
    endDate: {
      type: "string",
      description: "custom期間の終了日 (YYYY-MM-DD)。periodがcustomの場合のみ使用",
    },
  },
  execute: async (params, context) => {
    const { startDate, endDate, label } = resolvePeriod(
      params.period || "this_month",
      context,
      params.startDate,
      params.endDate,
    );

    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    if (holidays.length === 0) {
      return `期間: ${label}\n該当祝日: 0件\n\nこの期間に祝日はありません。`;
    }

    const lines = holidays.map((h, i) => {
      const d = new Date(h.date);
      return `[${i + 1}] ${formatDateJa(d)} ${h.name}`;
    });
    return `期間: ${label}\n該当祝日: ${holidays.length}件\n\n${lines.join("\n")}`;
  },
};

const checkConflicts: ConciergeTool = {
  name: "check_conflicts",
  description:
    "指定期間内の予定の重複（ダブルブッキング）を検出する。不備チェックに使用。",
  parameters: {
    period: {
      type: "string",
      description: "チェック期間",
      enum: [
        "today",
        "this_week",
        "next_week",
        "this_month",
        "custom",
      ],
    },
    startDate: {
      type: "string",
      description: "custom期間の開始日 (YYYY-MM-DD)。periodがcustomの場合のみ使用",
    },
    endDate: {
      type: "string",
      description: "custom期間の終了日 (YYYY-MM-DD)。periodがcustomの場合のみ使用",
    },
  },
  execute: async (params, context) => {
    const { startDate, endDate, label } = resolvePeriod(
      params.period || "this_month",
      context,
      params.startDate,
      params.endDate,
    );

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: context.userId,
        OR: [
          { startTime: { gte: startDate, lte: endDate } },
          { endTime: { gte: startDate, lte: endDate } },
        ],
      },
      orderBy: { startTime: "asc" },
    });

    // 終日イベントを除外して時間帯の重複を検出
    const timedEvents = events.filter((ev) => !ev.allDay);
    const conflicts: string[] = [];

    for (let i = 0; i < timedEvents.length; i++) {
      for (let j = i + 1; j < timedEvents.length; j++) {
        const a = timedEvents[i];
        const b = timedEvents[j];
        const aStart = new Date(a.startTime).getTime();
        const aEnd = new Date(a.endTime).getTime();
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();

        if (aStart < bEnd && bStart < aEnd) {
          conflicts.push(
            `⚠ 重複: ${formatDateJa(new Date(a.startTime))} ` +
              `${formatTimeJa(new Date(a.startTime))}〜${formatTimeJa(new Date(a.endTime))} 「${a.title}」 と ` +
              `${formatTimeJa(new Date(b.startTime))}〜${formatTimeJa(new Date(b.endTime))} 「${b.title}」`,
          );
        }
      }
    }

    const header = `期間: ${label}\n対象予定: ${events.length}件（うち時間指定: ${timedEvents.length}件）`;

    if (conflicts.length === 0) {
      return `${header}\n\n重複なし。スケジュールに問題はありません。`;
    }

    return `${header}\n重複検出: ${conflicts.length}件\n\n${conflicts.join("\n")}`;
  },
};

const getDailyDetail: ConciergeTool = {
  name: "get_daily_detail",
  description: "特定の1日の予定と祝日をまとめて取得する。",
  parameters: {
    date: {
      type: "string",
      description: "取得する日付 (YYYY-MM-DD)",
    },
  },
  execute: async (params, context) => {
    const targetDate = params.date
      ? new Date(params.date)
      : context.now;
    const dayStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
    const dayEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999,
    );

    const [events, holidays] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          userId: context.userId,
          OR: [
            { startTime: { gte: dayStart, lte: dayEnd } },
            { endTime: { gte: dayStart, lte: dayEnd } },
          ],
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.holiday.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
        },
      }),
    ]);

    const dateLabel = formatDateJa(dayStart);
    const parts: string[] = [`日付: ${dateLabel}`];

    if (holidays.length > 0) {
      parts.push(
        `祝日: ${holidays.map((h) => h.name).join(", ")}`,
      );
    }

    parts.push(`予定: ${events.length}件`);

    if (events.length > 0) {
      parts.push("");
      events.forEach((ev, i) => {
        parts.push(formatEventLine(ev, i));
      });
    } else {
      parts.push("\nこの日に予定はありません。");
    }

    return parts.join("\n");
  },
};

// ============================================
// ツールレジストリ
// ============================================

export const CONCIERGE_TOOLS: ConciergeTool[] = [
  getEvents,
  getHolidays,
  checkConflicts,
  getDailyDetail,
];

const toolMap = new Map(CONCIERGE_TOOLS.map((t) => [t.name, t]));

/**
 * ツール説明文を生成（Step 1 のプロンプトに使用）
 */
export function buildToolDescriptions(): string {
  return CONCIERGE_TOOLS.map((t) => {
    const paramDesc = Object.entries(t.parameters)
      .map(([name, p]) => {
        let desc = `    ${name} (${p.type}): ${p.description}`;
        if (p.enum) desc += ` [${p.enum.join(", ")}]`;
        return desc;
      })
      .join("\n");
    return `- ${t.name}: ${t.description}\n  パラメータ:\n${paramDesc}`;
  }).join("\n\n");
}

/**
 * ツールを実行
 */
export async function executeTool(
  call: ToolCall,
  context: ToolContext,
): Promise<string> {
  const tool = toolMap.get(call.tool);
  if (!tool) {
    return `エラー: 不明なツール "${call.tool}"`;
  }
  return tool.execute(call.params, context);
}

/**
 * Step 1 の出力をパースしてツールコール配列に変換
 */
export function parseToolCalls(raw: string): ToolCall[] {
  // マークダウンコードブロックを除去
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);

  if (Array.isArray(parsed)) {
    return parsed as ToolCall[];
  }
  return [parsed as ToolCall];
}
