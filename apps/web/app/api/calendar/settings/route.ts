import { apiHandler, ApiError } from "@/lib/api";
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
export const GET = apiHandler(async () => {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
  });

  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return { settings };
}, { admin: true });

// PUT /api/calendar/settings - カレンダー設定更新
export const PUT = apiHandler(async (request) => {
  const body = await request.json();
  const { settings } = body;

  if (!settings || typeof settings !== "object") {
    throw ApiError.badRequest("Invalid body");
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

  return { success: true };
}, { admin: true });
