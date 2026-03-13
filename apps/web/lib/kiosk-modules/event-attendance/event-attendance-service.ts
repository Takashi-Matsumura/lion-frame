/**
 * イベント出席管理サービス
 *
 * NFCカードIDから社員を照合し、出席記録を作成する。
 */

import { prisma } from "@/lib/prisma";

interface CheckInResult {
  status: "checked_in" | "already_checked_in" | "card_not_found" | "employee_not_found";
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    position: string;
    department: string;
    profileImage: string | null;
  };
  checkedInAt?: Date;
}

/**
 * NFCカードIDでチェックイン
 */
export async function checkInByNfc(
  kioskSessionId: string,
  nfcCardId: string,
): Promise<CheckInResult> {
  // NFCカードから社員を照合
  const nfcCard = await prisma.nfcCard.findUnique({
    where: { cardId: nfcCardId },
    include: {
      employee: {
        include: {
          department: { select: { name: true } },
        },
      },
    },
  });

  if (!nfcCard || !nfcCard.isActive) {
    return { status: "card_not_found" };
  }

  const employee = nfcCard.employee;
  if (!employee || !employee.isActive) {
    return { status: "employee_not_found" };
  }

  const employeeInfo = {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    position: employee.position,
    department: employee.department.name,
    profileImage: employee.profileImage,
  };

  // 重複チェック
  const existing = await prisma.eventAttendance.findUnique({
    where: {
      kioskSessionId_employeeId: {
        kioskSessionId,
        employeeId: employee.id,
      },
    },
  });

  if (existing) {
    return {
      status: "already_checked_in",
      employee: employeeInfo,
      checkedInAt: existing.checkedInAt,
    };
  }

  // 出席記録作成
  const attendance = await prisma.eventAttendance.create({
    data: {
      kioskSessionId,
      employeeId: employee.id,
      checkedInVia: "nfc",
      nfcCardId,
    },
  });

  return {
    status: "checked_in",
    employee: employeeInfo,
    checkedInAt: attendance.checkedInAt,
  };
}

/**
 * 手動チェックイン（社員ID指定）
 */
export async function checkInManual(
  kioskSessionId: string,
  employeeId: string,
): Promise<CheckInResult> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      department: { select: { name: true } },
    },
  });

  if (!employee || !employee.isActive) {
    return { status: "employee_not_found" };
  }

  const employeeInfo = {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    position: employee.position,
    department: employee.department.name,
    profileImage: employee.profileImage,
  };

  const existing = await prisma.eventAttendance.findUnique({
    where: {
      kioskSessionId_employeeId: {
        kioskSessionId,
        employeeId: employee.id,
      },
    },
  });

  if (existing) {
    return {
      status: "already_checked_in",
      employee: employeeInfo,
      checkedInAt: existing.checkedInAt,
    };
  }

  const attendance = await prisma.eventAttendance.create({
    data: {
      kioskSessionId,
      employeeId: employee.id,
      checkedInVia: "manual",
    },
  });

  return {
    status: "checked_in",
    employee: employeeInfo,
    checkedInAt: attendance.checkedInAt,
  };
}

/**
 * セッションの出席者一覧を取得
 */
export async function getAttendanceList(kioskSessionId: string) {
  return prisma.eventAttendance.findMany({
    where: { kioskSessionId },
    include: {
      employee: {
        select: {
          employeeId: true,
          name: true,
          position: true,
          profileImage: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { checkedInAt: "desc" },
  });
}
