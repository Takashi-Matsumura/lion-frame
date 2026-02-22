import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * カテゴリ一覧取得
 * GET /api/general-affairs/categories
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const categories = await prisma.resourceCategory.findMany({
      where,
      include: {
        _count: { select: { resources: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

/**
 * カテゴリ作成
 * POST /api/general-affairs/categories
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, nameEn, type, requiresApproval, color, order } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }
    if (!type || !["ROOM", "VEHICLE", "EQUIPMENT"].includes(type)) {
      return NextResponse.json(
        { error: "Valid type is required (ROOM, VEHICLE, EQUIPMENT)" },
        { status: 400 },
      );
    }

    const category = await prisma.resourceCategory.create({
      data: {
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
        type,
        requiresApproval: requiresApproval ?? false,
        color: color || null,
        order: order ?? 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
