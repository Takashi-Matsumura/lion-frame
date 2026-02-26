import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// PUT /api/calendar/company-events/[id] - 会社イベント更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { title, titleEn, startDate, endDate, category, description, departmentId } = body;

    const existing = await prisma.companyEvent.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Company event not found");
    }

    const event = await prisma.companyEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleEn !== undefined && { titleEn: titleEn || null }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && {
          description: description || null,
        }),
        ...(departmentId !== undefined && {
          departmentId: departmentId || null,
        }),
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
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error updating company event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/calendar/company-events/[id] - 会社イベント削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;

    const existing = await prisma.companyEvent.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Company event not found");
    }

    await prisma.companyEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error deleting company event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
