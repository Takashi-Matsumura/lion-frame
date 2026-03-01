import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/employees/[id]
 *
 * 社員詳細を取得
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            manager: {
              select: { id: true, name: true, position: true },
            },
            executive: {
              select: { id: true, name: true, position: true },
            },
          },
        },
        supervisor: {
          select: { id: true, name: true, position: true, positionCode: true },
        },
        deputy: {
          select: { id: true, name: true, position: true, positionCode: true },
        },
        section: {
          select: {
            id: true,
            name: true,
            code: true,
            manager: {
              select: { id: true, name: true, position: true },
            },
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            manager: {
              select: { id: true, name: true, position: true },
            },
          },
        },
      },
    });

    if (!employee) {
      throw ApiError.notFound("Employee not found");
    }

    // PositionMasterからcolorを取得
    let positionColor: string | null = null;
    if (employee.positionCode) {
      const positionMaster = await prisma.positionMaster.findUnique({
        where: { code: employee.positionCode },
        select: { color: true },
      });
      positionColor = positionMaster?.color ?? null;
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        nameKana: employee.nameKana,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        positionCode: employee.positionCode,
        positionColor,
        qualificationGrade: employee.qualificationGrade,
        qualificationGradeCode: employee.qualificationGradeCode,
        employmentType: employee.employmentType,
        employmentTypeCode: employee.employmentTypeCode,
        organization: employee.organization,
        department: employee.department,
        section: employee.section,
        course: employee.course,
        supervisor: employee.supervisor,
        deputy: employee.deputy,
        joinDate: employee.joinDate,
        birthDate: employee.birthDate,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error fetching employee:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
