import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * カテゴリ詳細取得
 * GET /api/general-affairs/categories/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const category = await prisma.resourceCategory.findUnique({
      where: { id },
      include: {
        resources: { where: { isActive: true }, orderBy: { name: "asc" } },
        _count: { select: { resources: true } },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to fetch category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 },
    );
  }
}

/**
 * カテゴリ更新
 * PUT /api/general-affairs/categories/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, nameEn, type, requiresApproval, color, order, isActive } =
      body;

    const existing = await prisma.resourceCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const category = await prisma.resourceCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(nameEn !== undefined && { nameEn: nameEn?.trim() || null }),
        ...(type !== undefined && { type }),
        ...(requiresApproval !== undefined && { requiresApproval }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

/**
 * カテゴリ削除
 * DELETE /api/general-affairs/categories/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.resourceCategory.findUnique({
      where: { id },
      include: { _count: { select: { resources: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    if (existing._count.resources > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete category with resources. Remove all resources first.",
        },
        { status: 400 },
      );
    }

    await prisma.resourceCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
