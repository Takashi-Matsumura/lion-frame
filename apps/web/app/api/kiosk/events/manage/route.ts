import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * GET /api/kiosk/events/manage — イベント一覧
 */
export const GET = apiHandler(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const events = await prisma.kioskEvent.findMany({
      where: status && status !== "all" ? { status } : undefined,
      include: {
        creator: { select: { name: true } },
        kioskSession: {
          select: {
            id: true,
            token: true,
            isActive: true,
            expiresAt: true,
            _count: { select: { attendances: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return { events };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);

/**
 * POST /api/kiosk/events/manage — イベント作成
 */
export const POST = apiHandler(
  async (request, session) => {
    const body = await request.json();
    const { name, nameEn, description, category, date, startTime, endTime, location, capacity } = body;

    if (!name || !category || !date) {
      throw ApiError.badRequest(
        "name, category, and date are required",
        "イベント名、カテゴリ、日付は必須です",
      );
    }

    const event = await prisma.kioskEvent.create({
      data: {
        name,
        nameEn: nameEn || null,
        description: description || null,
        category,
        date: new Date(date + "T00:00:00+09:00"),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        location: location || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        createdBy: session.user.id,
      },
      include: {
        creator: { select: { name: true } },
      },
    });

    return { event };
  },
  { requiredRoles: ["ADMIN"] as Role[], successStatus: 201 },
);
