import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/admin/organization/apply-pending
 *
 * 適用待ちの未来発令レコード数を返す
 */
export const GET = apiHandler(async () => {
  // 今日のJST日付の終わり
  const todayJSTStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const todayEndJST = new Date(todayJSTStr + "T23:59:59.999+09:00");

  // 発令日が到来した未来発令レコードを検索
  const pendingHistories = await prisma.employeeHistory.findMany({
    where: {
      validFrom: { lte: todayEndJST },
      changeReason: { contains: "未来発令" },
    },
    include: {
      employee: {
        select: { id: true, employeeId: true, name: true, isActive: true },
      },
    },
  });

  // Employee が stub 状態（name === ""）のものだけをフィルタ
  const pending = pendingHistories.filter(
    (h) => h.employee.name === "" && !h.employee.isActive,
  );

  return {
    count: pending.length,
    items: pending.map((h) => ({
      historyId: h.id,
      employeeId: h.employee.employeeId,
      name: h.name,
      position: h.position,
      departmentName: h.departmentName,
      sectionName: h.sectionName,
      courseName: h.courseName,
      validFrom: h.validFrom.toISOString(),
    })),
  };
}, { admin: true });

/**
 * POST /api/admin/organization/apply-pending
 *
 * 未来発令を適用（stub Employee を EmployeeHistory の値で更新）
 */
export const POST = apiHandler(async (_request, session) => {
  const todayJSTStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const todayEndJST = new Date(todayJSTStr + "T23:59:59.999+09:00");

  const pendingHistories = await prisma.employeeHistory.findMany({
    where: {
      validFrom: { lte: todayEndJST },
      changeReason: { contains: "未来発令" },
    },
    include: {
      employee: {
        select: { id: true, employeeId: true, name: true, isActive: true },
      },
    },
  });

  const pending = pendingHistories.filter(
    (h) => h.employee.name === "" && !h.employee.isActive,
  );

  if (pending.length === 0) {
    return { applied: 0 };
  }

  // トランザクション内で適用
  const applied = await prisma.$transaction(async (tx) => {
    let count = 0;

    for (const h of pending) {
      // Employee を EmployeeHistory の値で更新
      await tx.employee.update({
        where: { id: h.employee.id },
        data: {
          name: h.name,
          nameKana: h.nameKana,
          email: h.email || null,
          phone: h.phone,
          position: h.position,
          positionCode: h.positionCode,
          qualificationGrade: h.qualificationGrade,
          qualificationGradeCode: h.qualificationGradeCode,
          employmentType: h.employmentType,
          employmentTypeCode: h.employmentTypeCode,
          departmentId: h.departmentId,
          sectionId: h.sectionId,
          courseId: h.courseId,
          birthDate: h.birthDate,
          retirementDate: h.retirementDate,
          isActive: h.isActive,
        },
      });

      // changeReason を更新して再適用防止
      await tx.employeeHistory.update({
        where: { id: h.id },
        data: {
          changeReason: h.changeReason?.replace("未来発令", "発令適用済み") ?? "発令適用済み",
        },
      });

      count++;
    }

    return count;
  });

  await AuditService.log({
    action: "APPLY_PENDING_IMPORTS",
    category: "SYSTEM_SETTING",
    userId: session.user?.id,
    details: {
      appliedCount: applied,
      employeeIds: pending.map((h) => h.employee.employeeId),
    },
  });

  return { applied };
}, { admin: true });
