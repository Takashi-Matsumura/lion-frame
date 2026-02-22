import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * リソース一覧取得
 * GET /api/general-affairs/resources
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (type) where.category = { type };
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const resources = await prisma.resource.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            type: true,
            requiresApproval: true,
            color: true,
          },
        },
      },
      orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error("Failed to fetch resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 },
    );
  }
}

/**
 * リソース作成
 * POST /api/general-affairs/resources
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { categoryId, name, nameEn, location, capacity, specifications, notes } =
      body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }
    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 },
      );
    }

    const category = await prisma.resourceCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const resource = await prisma.resource.create({
      data: {
        categoryId,
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
        location: location?.trim() || null,
        capacity: capacity ?? null,
        specifications: specifications || null,
        notes: notes?.trim() || null,
      },
      include: {
        category: {
          select: { id: true, name: true, type: true, color: true },
        },
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error("Failed to create resource:", error);
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 },
    );
  }
}
