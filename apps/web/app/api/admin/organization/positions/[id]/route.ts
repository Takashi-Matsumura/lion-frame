import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
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
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { code, name, nameJa, level, isManager, color, displayOrder, isActive } = body;

    const existing = await prisma.positionMaster.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound("Position not found");
    }

    // コード変更時の重複チェック
    if (code && code !== existing.code) {
      const duplicate = await prisma.positionMaster.findUnique({
        where: { code },
      });
      if (duplicate) {
        throw ApiError.conflict("Position code already exists");
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
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error updating position:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    await requireAdmin();

    const { id } = await params;

    const existing = await prisma.positionMaster.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound("Position not found");
    }

    // 使用中チェック: この役職コードを持つ社員がいるか
    const employeeCount = await prisma.employee.count({
      where: { positionCode: existing.code },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        { error: "Position is in use", employeeCount },
        { status: 409 },
      );
    }

    await prisma.positionMaster.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error deleting position:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
