import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/calendar/holidays - 祝日一覧取得
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const type = searchParams.get("type"); // national, company, or all

  // Build where clause
  const where: {
    date?: { gte?: Date; lte?: Date };
    type?: string;
  } = {};

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (type && type !== "all") {
    where.type = type;
  }

  const holidays = await prisma.holiday.findMany({
    where,
    orderBy: { date: "asc" },
  });

  // Format dates for frontend (YYYY-MM-DD)
  const formattedHolidays = holidays.map((h) => ({
    id: h.id,
    date: h.date.toISOString().split("T")[0],
    name: h.name,
    nameEn: h.nameEn,
    type: h.type,
    description: h.description,
  }));

  return { holidays: formattedHolidays };
});

// POST /api/calendar/holidays - 祝日作成
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { date, name, nameEn, type, description } = body;

  if (!date || !name) {
    throw ApiError.badRequest("Date and name are required");
  }

  const holiday = await prisma.holiday.create({
    data: {
      date: new Date(date),
      name,
      nameEn: nameEn || null,
      type: type || "national",
      description: description || null,
    },
  });

  return {
    holiday: {
      id: holiday.id,
      date: holiday.date.toISOString().split("T")[0],
      name: holiday.name,
      nameEn: holiday.nameEn,
      type: holiday.type,
      description: holiday.description,
    },
  };
}, { admin: true });
