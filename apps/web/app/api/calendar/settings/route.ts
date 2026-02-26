import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SETTING_KEYS = [
  "calendar_week_start",
  "calendar_default_view",
  "calendar_working_hours_start",
  "calendar_working_hours_end",
] as const;

const DEFAULTS: Record<string, string> = {
  calendar_week_start: "sunday",
  calendar_default_view: "dual",
  calendar_working_hours_start: "09:00",
  calendar_working_hours_end: "18:00",
};

// GET /api/calendar/settings - カレンダー設定取得
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
  });

  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}

// PUT /api/calendar/settings - カレンダー設定更新
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { settings } = body;

  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  for (const key of SETTING_KEYS) {
    if (settings[key] !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(settings[key]) },
        create: { key, value: String(settings[key]) },
      });
    }
  }

  return NextResponse.json({ success: true });
}
