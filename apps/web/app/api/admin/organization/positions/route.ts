import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/organization/positions
 * 全役職一覧を取得（管理者のみ）
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const positions = await prisma.positionMaster.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ positions });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/organization/positions
 * 役職を作成（管理者のみ）
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, nameJa, level, isManager, color, displayOrder } = body;

    if (!code || !name || !nameJa) {
      return NextResponse.json(
        { error: "Code, name, and nameJa are required" },
        { status: 400 },
      );
    }

    // 重複チェック
    const existing = await prisma.positionMaster.findUnique({
      where: { code },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Position code already exists" },
        { status: 409 },
      );
    }

    const position = await prisma.positionMaster.create({
      data: {
        code,
        name,
        nameJa,
        level: level || "STAFF",
        isManager: isManager ?? false,
        color: color || null,
        displayOrder: displayOrder ?? 0,
      },
    });

    return NextResponse.json({ position }, { status: 201 });
  } catch (error) {
    console.error("Error creating position:", error);
    return NextResponse.json(
      { error: "Failed to create position" },
      { status: 500 },
    );
  }
}
