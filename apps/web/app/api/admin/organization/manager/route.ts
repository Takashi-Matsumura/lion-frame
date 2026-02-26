import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

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

  if (!["department", "section", "course"].includes(type)) {
    throw ApiError.badRequest("Invalid type. Must be department, section, or course");
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

  return {
    success: true,
    type,
    id,
    manager: result?.manager || null,
  };
}, { admin: true });
