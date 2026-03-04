import { apiHandler, ApiError } from "@/lib/api";
import { ManagerHistoryService } from "@/lib/history/manager-history-service";
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
  const { type, id, managerId, groupMode } = body;

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
    await ManagerHistoryService.recordManagerChange({
      unitType: "department",
      unitId: id,
      managerId: managerId || null,
      effectiveDate: new Date(),
      changeReason: managerId ? "手動設定" : "責任者解除",
      changedBy: session.user?.id || "system",
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
    await ManagerHistoryService.recordManagerChange({
      unitType: "section",
      unitId: id,
      managerId: managerId || null,
      effectiveDate: new Date(),
      changeReason: managerId ? "手動設定" : "責任者解除",
      changedBy: session.user?.id || "system",
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
    await ManagerHistoryService.recordManagerChange({
      unitType: "course",
      unitId: id,
      managerId: managerId || null,
      effectiveDate: new Date(),
      changeReason: managerId ? "手動設定" : "責任者解除",
      changedBy: session.user?.id || "system",
    });
  }

  // グループモード: 全PUBLISHED組織の同名ユニットにも伝播
  let propagatedUnits = 0;
  if (groupMode && type !== "department-executive") {
    // 対象ユニットの名前・階層パスを取得
    let unitName = "";
    let deptName = "";
    let sectName = "";

    if (type === "department") {
      const dept = await prisma.department.findUnique({
        where: { id },
        select: { name: true },
      });
      if (dept) { unitName = dept.name; deptName = dept.name; }
    } else if (type === "section") {
      const sect = await prisma.section.findUnique({
        where: { id },
        select: { name: true, department: { select: { name: true } } },
      });
      if (sect) { unitName = sect.name; deptName = sect.department.name; }
    } else if (type === "course") {
      const course = await prisma.course.findUnique({
        where: { id },
        select: {
          name: true,
          section: { select: { name: true, department: { select: { name: true } } } },
        },
      });
      if (course) {
        unitName = course.name;
        sectName = course.section.name;
        deptName = course.section.department.name;
      }
    }

    // 全PUBLISHED組織から同名ユニットを検索して更新
    const publishedOrgs = await prisma.organization.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true },
    });

    for (const org of publishedOrgs) {
      if (type === "department") {
        const matchingDepts = await prisma.department.findMany({
          where: { organizationId: org.id, name: deptName, id: { not: id } },
          select: { id: true },
        });
        for (const d of matchingDepts) {
          await prisma.department.update({
            where: { id: d.id },
            data: { managerId: managerId || null },
          });
          await ManagerHistoryService.recordManagerChange({
            unitType: "department",
            unitId: d.id,
            managerId: managerId || null,
            effectiveDate: new Date(),
            changeReason: managerId ? "グループ統合モードで手動設定" : "グループ統合モードで責任者解除",
            changedBy: session.user?.id || "system",
          });
          propagatedUnits++;
        }
      } else if (type === "section") {
        const matchingSects = await prisma.section.findMany({
          where: {
            name: unitName,
            department: { organizationId: org.id, name: deptName },
            id: { not: id },
          },
          select: { id: true },
        });
        for (const s of matchingSects) {
          await prisma.section.update({
            where: { id: s.id },
            data: { managerId: managerId || null },
          });
          await ManagerHistoryService.recordManagerChange({
            unitType: "section",
            unitId: s.id,
            managerId: managerId || null,
            effectiveDate: new Date(),
            changeReason: managerId ? "グループ統合モードで手動設定" : "グループ統合モードで責任者解除",
            changedBy: session.user?.id || "system",
          });
          propagatedUnits++;
        }
      } else if (type === "course") {
        const matchingCourses = await prisma.course.findMany({
          where: {
            name: unitName,
            section: {
              name: sectName,
              department: { organizationId: org.id, name: deptName },
            },
            id: { not: id },
          },
          select: { id: true },
        });
        for (const c of matchingCourses) {
          await prisma.course.update({
            where: { id: c.id },
            data: { managerId: managerId || null },
          });
          await ManagerHistoryService.recordManagerChange({
            unitType: "course",
            unitId: c.id,
            managerId: managerId || null,
            effectiveDate: new Date(),
            changeReason: managerId ? "グループ統合モードで手動設定" : "グループ統合モードで責任者解除",
            changedBy: session.user?.id || "system",
          });
          propagatedUnits++;
        }
      }
    }
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
      ...(groupMode ? { groupMode: true, propagatedUnits } : {}),
    },
  });

  return {
    success: true,
    type,
    id,
    manager: result?.manager || null,
    supervisorAutoAssign: (result as Record<string, unknown> | undefined)?.supervisorAutoAssign ?? null,
    ...(groupMode ? { propagatedUnits } : {}),
  };
}, { admin: true });
