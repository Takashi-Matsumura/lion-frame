import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * リソースの空き状況確認
 * GET /api/general-affairs/availability
 * params: resourceId, startDate, endDate
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get("resourceId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!resourceId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "resourceId, startDate, endDate are required" },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 該当リソースの予約（PENDING/CONFIRMED）を取得
    const reservations = await prisma.reservation.findMany({
      where: {
        resourceId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({
      resourceId,
      startDate,
      endDate,
      reservations,
    });
  } catch (error) {
    console.error("Failed to fetch availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 },
    );
  }
}
