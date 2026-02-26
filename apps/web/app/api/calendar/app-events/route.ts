import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/calendar/app-events - イベント一覧取得
export const GET = apiHandler(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: {
    userId: string;
    startTime?: { gte: Date };
    endTime?: { lte: Date };
  } = {
    userId: session.user.id,
  };

  if (startDate) {
    where.startTime = { gte: new Date(startDate) };
  }
  if (endDate) {
    // endDateの翌日の0時まで含める
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    where.endTime = { lte: end };
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startTime: "asc" },
  });

  return { events };
});

// POST /api/calendar/app-events - イベント作成
export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const {
    title,
    description,
    location,
    startTime,
    endTime,
    allDay,
    category,
    color,
  } = body;

  if (!title || !startTime || !endTime) {
    throw ApiError.badRequest("title, startTime, endTime are required");
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: session.user.id,
      title,
      description: description || null,
      location: location || null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      allDay: allDay || false,
      category: category || "personal",
      color: color || null,
    },
  });

  return { event };
}, { successStatus: 201 });
