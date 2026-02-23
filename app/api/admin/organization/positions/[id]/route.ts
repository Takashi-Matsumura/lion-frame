import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/organization/positions/[id]
 * 役職を更新（管理者のみ）
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { code, name, nameJa, level, isManager, color, displayOrder, isActive } = body;

    const existing = await prisma.positionMaster.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 },
      );
    }

    // コード変更時の重複チェック
    if (code && code !== existing.code) {
      const duplicate = await prisma.positionMaster.findUnique({
        where: { code },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Position code already exists" },
          { status: 409 },
        );
      }
    }

    const position = await prisma.positionMaster.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(nameJa !== undefined && { nameJa }),
        ...(level !== undefined && { level }),
        ...(isManager !== undefined && { isManager }),
        ...(color !== undefined && { color: color || null }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ position });
  } catch (error) {
    console.error("Error updating position:", error);
    return NextResponse.json(
      { error: "Failed to update position" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/organization/positions/[id]
 * 役職を削除（管理者のみ、使用中は409）
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.positionMaster.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 },
      );
    }

    // 使用中チェック: この役職コードを持つ社員がいるか
    const employeeCount = await prisma.employee.count({
      where: { positionCode: existing.code },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        {
          error: "Position is in use",
          employeeCount,
        },
        { status: 409 },
      );
    }

    await prisma.positionMaster.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting position:", error);
    return NextResponse.json(
      { error: "Failed to delete position" },
      { status: 500 },
    );
  }
}
