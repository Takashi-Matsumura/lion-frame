import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// PUT /api/calendar/holidays/[id] - 祝日更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { date, name, nameEn, type, description } = body;

    // Check if holiday exists
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Holiday not found");
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn: nameEn || null }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    return NextResponse.json({
      holiday: {
        id: holiday.id,
        date: holiday.date.toISOString().split("T")[0],
        name: holiday.name,
        nameEn: holiday.nameEn,
        type: holiday.type,
        description: holiday.description,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error updating holiday:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/calendar/holidays/[id] - 祝日削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;

    // Check if holiday exists
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Holiday not found");
    }

    await prisma.holiday.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error deleting holiday:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
