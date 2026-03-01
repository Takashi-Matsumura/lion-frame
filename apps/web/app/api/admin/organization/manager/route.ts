import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { SupervisorService } from "@/lib/services/supervisor-service";

/**
 * PATCH /api/admin/organization/manager
 *
 * 部署の責任者を更新
 */
export const PATCH = apiHandler(async (request, session) => {
  const body = await request.json();
  const { type, id, managerId } = body;

  if (!type || !id) {
    throw ApiError.badRequest("Type and ID are required");
  }

  if (!["department", "section", "course", "department-executive"].includes(type)) {
    throw ApiError.badRequest("Invalid type. Must be department, section, course, or department-executive");
  }

  // Update the manager based on type
  let result:
    | {
        manager: { id: string; name: string; position: string | null } | null;
      }
    | undefined;

  if (type === "department-executive") {
    const updated = await prisma.department.update({
      where: { id },
      data: { executiveId: managerId || null },
      include: {
        executive: {
          select: { id: true, name: true, position: true },
        },
      },
    });
    result = { manager: updated.executive };

    // 担当役員が設定された場合、配下社員の supervisorId を自動割り当て
    if (managerId) {
      const autoAssignResult = await SupervisorService.autoAssignSupervisors(id, managerId);
      await AuditService.log({
        action: "SUPERVISOR_AUTO_ASSIGN",
        category: "SYSTEM_SETTING",
        userId: session.user?.id,
        targetId: id,
        targetType: "department",
        details: {
          executiveId: managerId,
          assignmentsCount: autoAssignResult.assignments.length,
          skippedCount: autoAssignResult.skipped.length,
        },
      });

      // レスポンスに自動割り当て結果を含める（後で返却時に使用）
      (result as Record<string, unknown>).supervisorAutoAssign = {
        assignmentsCount: autoAssignResult.assignments.length,
        skippedCount: autoAssignResult.skipped.length,
      };
    }
  } else if (type === "department") {
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

  return {
    success: true,
    type,
    id,
    manager: result?.manager || null,
    supervisorAutoAssign: (result as Record<string, unknown> | undefined)?.supervisorAutoAssign ?? null,
  };
}, { admin: true });
