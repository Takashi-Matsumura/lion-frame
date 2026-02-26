import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendar/company-events - 会社イベント一覧取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const category = searchParams.get("category");

  const where: {
    startDate?: { gte?: Date; lte?: Date };
    endDate?: { gte?: Date };
    category?: string;
  } = {};

  if (startDate && endDate) {
    where.startDate = { lte: new Date(endDate) };
    where.endDate = { gte: new Date(startDate) };
  }

  if (category && category !== "all") {
    where.category = category;
  }

  const events = await prisma.companyEvent.findMany({
    where,
    include: { department: { select: { id: true, name: true } } },
    orderBy: { startDate: "asc" },
  });

  const formattedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    titleEn: e.titleEn,
    startDate: e.startDate.toISOString().split("T")[0],
    endDate: e.endDate.toISOString().split("T")[0],
    category: e.category,
    description: e.description,
    departmentId: e.departmentId,
    departmentName: e.department?.name ?? null,
  }));

  return NextResponse.json({ events: formattedEvents });
}

// POST /api/calendar/company-events - 会社イベント作成
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, titleEn, startDate, endDate, category, description, departmentId } = body;

  if (!title || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Title, startDate and endDate are required" },
      { status: 400 },
    );
  }

  try {
    const event = await prisma.companyEvent.create({
      data: {
        title,
        titleEn: titleEn || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        category: category || "event",
        description: description || null,
        departmentId: departmentId || null,
      },
      include: { department: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        titleEn: event.titleEn,
        startDate: event.startDate.toISOString().split("T")[0],
        endDate: event.endDate.toISOString().split("T")[0],
        category: event.category,
        description: event.description,
        departmentId: event.departmentId,
        departmentName: event.department?.name ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create company event:", error);
    return NextResponse.json(
      { error: "Failed to create company event" },
      { status: 500 },
    );
  }
}
