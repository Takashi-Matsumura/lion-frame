import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * リソース詳細取得
 * GET /api/general-affairs/resources/[id]
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
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error("Failed to fetch resource:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource" },
      { status: 500 },
    );
  }
}

/**
 * リソース更新
 * PUT /api/general-affairs/resources/[id]
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
    const { categoryId, name, nameEn, location, capacity, specifications, notes, isActive } =
      body;

    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 },
      );
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(name !== undefined && { name: name.trim() }),
        ...(nameEn !== undefined && { nameEn: nameEn?.trim() || null }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(capacity !== undefined && { capacity }),
        ...(specifications !== undefined && { specifications }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        category: {
          select: { id: true, name: true, type: true, color: true },
        },
      },
    });

    return NextResponse.json(resource);
  } catch (error) {
    console.error("Failed to update resource:", error);
    return NextResponse.json(
      { error: "Failed to update resource" },
      { status: 500 },
    );
  }
}

/**
 * リソース削除
 * DELETE /api/general-affairs/resources/[id]
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

    const existing = await prisma.resource.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reservations: {
              where: { status: { in: ["PENDING", "CONFIRMED"] } },
            },
          },
        },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 },
      );
    }

    if (existing._count.reservations > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete resource with active reservations. Cancel all reservations first.",
        },
        { status: 400 },
      );
    }

    await prisma.resource.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete resource:", error);
    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 },
    );
  }
}
