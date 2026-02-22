import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 予約一覧取得
 * GET /api/general-affairs/reservations
 * - 一般ユーザー: 自分の予約のみ
 * - backoffice: 全件 (?all=true)
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const status = searchParams.get("status");
    const resourceId = searchParams.get("resourceId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    // 自分の予約のみ（all=trueでない場合）
    if (!all) {
      where.userId = session.user.id;
    }

    if (status) where.status = status;
    if (resourceId) where.resourceId = resourceId;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate)
        (where.startTime as Record<string, unknown>).gte = new Date(startDate);
      if (endDate)
        (where.startTime as Record<string, unknown>).lte = new Date(endDate);
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        resource: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                type: true,
                color: true,
                requiresApproval: true,
              },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Failed to fetch reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 },
    );
  }
}

/**
 * 予約作成
 * POST /api/general-affairs/reservations
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { resourceId, title, startTime, endTime } = body;

    if (!resourceId || !title?.trim() || !startTime || !endTime) {
      return NextResponse.json(
        { error: "resourceId, title, startTime, endTime are required" },
        { status: 400 },
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 },
      );
    }

    // JST日付単位で過去チェック（当日の予約は許可）
    const todayJST = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Tokyo",
    });
    const startJST = start.toLocaleDateString("en-CA", {
      timeZone: "Asia/Tokyo",
    });
    if (startJST < todayJST) {
      return NextResponse.json(
        { error: "PAST_DATE" },
        { status: 400 },
      );
    }

    // リソース存在確認
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { category: true },
    });
    if (!resource || !resource.isActive) {
      return NextResponse.json(
        { error: "Resource not found or inactive" },
        { status: 404 },
      );
    }

    // 競合チェック（PENDING/CONFIRMEDの予約と時間重複）
    const conflict = await prisma.reservation.findFirst({
      where: {
        resourceId,
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

    // 承認不要カテゴリの場合は自動CONFIRMED
    const status = resource.category.requiresApproval
      ? "PENDING"
      : "CONFIRMED";

    const reservation = await prisma.reservation.create({
      data: {
        resourceId,
        userId: session.user.id,
        title: title.trim(),
        startTime: start,
        endTime: end,
        status,
      },
      include: {
        resource: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                type: true,
                color: true,
                requiresApproval: true,
              },
            },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Failed to create reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 },
    );
  }
}
