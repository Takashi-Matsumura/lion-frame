import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/calendar/app-events/[id] - イベント詳細取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!event) {
      throw ApiError.notFound("Event not found");
    }

    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error fetching event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/calendar/app-events/[id] - イベント更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
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

    // 所有者確認
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingEvent) {
      throw ApiError.notFound("Event not found");
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: new Date(endTime) }),
        ...(allDay !== undefined && { allDay }),
        ...(category !== undefined && { category }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error updating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/calendar/app-events/[id] - イベント削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // 所有者確認
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingEvent) {
      throw ApiError.notFound("Event not found");
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
