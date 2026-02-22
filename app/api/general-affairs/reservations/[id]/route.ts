import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 予約詳細取得
 * GET /api/general-affairs/reservations/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        resource: {
          include: { category: true },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Failed to fetch reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 },
    );
  }
}

/**
 * 予約更新
 * PUT /api/general-affairs/reservations/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, startTime, endTime } = body;

    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { resource: { include: { category: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    // 自分の予約のみ更新可
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existing.status === "CANCELLED" || existing.status === "RETURNED") {
      return NextResponse.json(
        { error: "Cannot update cancelled or returned reservation" },
        { status: 400 },
      );
    }

    const start = startTime ? new Date(startTime) : existing.startTime;
    const end = endTime ? new Date(endTime) : existing.endTime;

    if (start >= end) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 },
      );
    }

    // 時間変更がある場合は競合チェック
    if (startTime || endTime) {
      const conflict = await prisma.reservation.findFirst({
        where: {
          resourceId: existing.resourceId,
          id: { not: id },
          status: { in: ["PENDING", "CONFIRMED"] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: "Time slot conflicts with an existing reservation" },
          { status: 409 },
        );
      }
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(startTime && { startTime: start }),
        ...(endTime && { endTime: end }),
      },
      include: {
        resource: { include: { category: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Failed to update reservation:", error);
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 },
    );
  }
}

/**
 * 予約キャンセル
 * DELETE /api/general-affairs/reservations/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    // 自分の予約のみキャンセル可
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existing.status === "CANCELLED" || existing.status === "RETURNED") {
      return NextResponse.json(
        { error: "Reservation already cancelled or returned" },
        { status: 400 },
      );
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Failed to cancel reservation:", error);
    return NextResponse.json(
      { error: "Failed to cancel reservation" },
      { status: 500 },
    );
  }
}
