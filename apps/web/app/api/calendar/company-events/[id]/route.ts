import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/calendar/company-events/[id] - 会社イベント更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, titleEn, startDate, endDate, category, description } = body;

  const existing = await prisma.companyEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Company event not found" },
      { status: 404 },
    );
  }

  try {
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
      },
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
      },
    });
  } catch (error) {
    console.error("Failed to update company event:", error);
    return NextResponse.json(
      { error: "Failed to update company event" },
      { status: 500 },
    );
  }
}

// DELETE /api/calendar/company-events/[id] - 会社イベント削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.companyEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Company event not found" },
      { status: 404 },
    );
  }

  try {
    await prisma.companyEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete company event:", error);
    return NextResponse.json(
      { error: "Failed to delete company event" },
      { status: 500 },
    );
  }
}
