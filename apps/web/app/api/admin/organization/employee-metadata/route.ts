import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * PATCH /api/admin/organization/employee-metadata
 *
 * 社員の承認基盤メタデータ（supervisorId / deputyId）を更新
 */
export const PATCH = apiHandler(
  async (request, session) => {
    const body = await request.json();
    const { employeeId, field, value } = body;

    if (!employeeId) {
      throw ApiError.badRequest("employeeId is required");
    }

    if (!["supervisorId", "deputyId"].includes(field)) {
      throw ApiError.badRequest(
        "field must be 'supervisorId' or 'deputyId'",
      );
    }

    // 自分自身への参照を防止
    if (value && value === employeeId) {
      throw ApiError.badRequest("Cannot assign employee to themselves");
    }

    // 対象社員の存在確認
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true },
    });
    if (!employee) {
      throw ApiError.notFound("Employee not found");
    }

    // 割当先社員の存在確認（nullでない場合）
    let assignedEmployee: { id: string; name: string; position: string } | null =
      null;
    if (value) {
      const target = await prisma.employee.findUnique({
        where: { id: value },
        select: { id: true, name: true, position: true },
      });
      if (!target) {
        throw ApiError.notFound("Target employee not found");
      }
      assignedEmployee = target;
    }

    // 更新
    await prisma.employee.update({
      where: { id: employeeId },
      data: { [field]: value || null },
    });

    await AuditService.log({
      action: "EMPLOYEE_METADATA_UPDATE",
      category: "SYSTEM_SETTING",
      userId: session.user?.id,
      targetId: employeeId,
      targetType: "Employee",
      details: {
        field,
        value: value || null,
        assignedName: assignedEmployee?.name || null,
      },
    });

    return {
      success: true,
      employeeId,
      field,
      assigned: assignedEmployee,
    };
  },
  { admin: true },
);
