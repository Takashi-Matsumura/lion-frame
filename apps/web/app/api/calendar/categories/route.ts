import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const SETTING_KEY = "calendar_categories";

const DEFAULT_CATEGORIES = [
  { id: "personal", name: "個人", nameEn: "Personal", color: "bg-yellow-300", enabled: true, builtIn: true },
  { id: "work", name: "業務", nameEn: "Work", color: "bg-orange-300", enabled: true, builtIn: true },
  { id: "meeting", name: "会議", nameEn: "Meeting", color: "bg-blue-300", enabled: true, builtIn: true },
  { id: "visitor", name: "来客", nameEn: "Visitor", color: "bg-purple-300", enabled: true, builtIn: true },
  { id: "trip", name: "出張", nameEn: "Trip", color: "bg-pink-300", enabled: true, builtIn: true },
  { id: "other", name: "その他", nameEn: "Other", color: "bg-gray-500", enabled: true, builtIn: true },
];

// GET /api/calendar/categories - カテゴリ一覧取得
export const GET = apiHandler(async () => {
  const row = await prisma.systemSetting.findUnique({
    where: { key: SETTING_KEY },
  });

  if (row) {
    try {
      const categories = JSON.parse(row.value);
      return { categories };
    } catch {
      // fallback to defaults
    }
  }

  return { categories: DEFAULT_CATEGORIES };
}, { admin: true });

// PUT /api/calendar/categories - カテゴリ一覧更新
export const PUT = apiHandler(async (request) => {
  const body = await request.json();
  const { categories } = body;

  if (!Array.isArray(categories)) {
    throw ApiError.badRequest("Invalid body");
  }

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(categories) },
    create: { key: SETTING_KEY, value: JSON.stringify(categories) },
  });

  return { success: true };
}, { admin: true });
