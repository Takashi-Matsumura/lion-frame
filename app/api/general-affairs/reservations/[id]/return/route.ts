import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 返却処理
 * POST /api/general-affairs/reservations/[id]/return
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.reservation.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    if (existing.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Only CONFIRMED reservations can be returned" },
        { status: 400 },
      );
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: "RETURNED",
        returnedAt: new Date(),
      },
      include: {
        resource: { include: { category: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Failed to return reservation:", error);
    return NextResponse.json(
      { error: "Failed to process return" },
      { status: 500 },
    );
  }
}
