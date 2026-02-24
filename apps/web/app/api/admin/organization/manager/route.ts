import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * PATCH /api/admin/organization/manager
 *
 * 部署の責任者を更新
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, managerId } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: "Type and ID are required" },
        { status: 400 },
      );
    }

    if (!["department", "section", "course"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be department, section, or course" },
        { status: 400 },
      );
    }

    // Update the manager based on type
    let result:
      | {
          manager: { id: string; name: string; position: string | null } | null;
        }
      | undefined;

    if (type === "department") {
      result = await prisma.department.update({
        where: { id },
        data: { managerId: managerId || null },
        include: {
          manager: {
            select: { id: true, name: true, position: true },
          },
        },
      });
    } else if (type === "section") {
      result = await prisma.section.update({
        where: { id },
        data: { managerId: managerId || null },
        include: {
          manager: {
            select: { id: true, name: true, position: true },
          },
        },
      });
    } else if (type === "course") {
      result = await prisma.course.update({
        where: { id },
        data: { managerId: managerId || null },
        include: {
          manager: {
            select: { id: true, name: true, position: true },
          },
        },
      });
    }

    await AuditService.log({
      action: "MANAGER_ASSIGN",
      category: "SYSTEM_SETTING",
      userId: session.user?.id,
      targetId: id,
      targetType: type,
      details: {
        type,
        managerId: managerId || null,
        managerName: result?.manager?.name || null,
      },
    });

    return NextResponse.json({
      success: true,
      type,
      id,
      manager: result?.manager || null,
    });
  } catch (error) {
    console.error("Error updating manager:", error);
    return NextResponse.json(
      { error: "Failed to update manager" },
      { status: 500 },
    );
  }
}
