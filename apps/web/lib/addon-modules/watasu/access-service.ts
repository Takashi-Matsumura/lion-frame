import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import type { AccessKey, Role } from "@prisma/client";

export interface EmployeeAccessInfo {
  employeeId: string;
  employeeName: string;
  departmentName: string;
  sectionName: string | null;
  userId: string | null;
  hasAccess: boolean;
}

export class WatasuAccessService {
  /**
   * システム用 watasu AccessKey を取得、なければ自動生成
   */
  static async getOrCreateSystemAccessKey(): Promise<AccessKey> {
    const existing = await prisma.accessKey.findFirst({
      where: { name: "watasu", createdBy: "system" },
      orderBy: { createdAt: "asc" },
    });

    if (existing) return existing;

    // 自動生成
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const key = `WATASU-${Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")}`;

    return prisma.$transaction(async (tx) => {
      const accessKey = await tx.accessKey.create({
        data: {
          key,
          name: "watasu",
          targetUserId: null,
          menuPaths: JSON.stringify(["/watasu"]),
          expiresAt: new Date("2099-12-31T23:59:59Z"),
          isActive: true,
          createdBy: "system",
        },
      });

      await tx.accessKeyPermission.create({
        data: {
          accessKeyId: accessKey.id,
          granularity: "menu",
          moduleId: "watasu",
          menuPath: "/watasu",
        },
      });

      return accessKey;
    });
  }

  /**
   * 部門メンバー一覧 + わたすアクセス状態を取得
   */
  static async getEmployeesWithAccessStatus(
    userId: string,
    role: Role,
  ): Promise<EmployeeAccessInfo[]> {
    const accessKey = await this.getOrCreateSystemAccessKey();

    // MANAGER: 自分が管理する部門のメンバーのみ
    // ADMIN: 全社員
    let employees;

    if (role === "ADMIN") {
      employees = await prisma.employee.findMany({
        where: { isActive: true },
        include: {
          department: { select: { name: true } },
          section: { select: { name: true } },
        },
        orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
      });
    } else {
      // MANAGER/EXECUTIVE: 自分の Employee → managedDepartments
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.email) return [];

      const managerEmployee = await prisma.employee.findUnique({
        where: { email: user.email },
        include: { managedDepartments: { select: { id: true } } },
      });

      if (!managerEmployee || managerEmployee.managedDepartments.length === 0) {
        return [];
      }

      const departmentIds = managerEmployee.managedDepartments.map((d) => d.id);

      employees = await prisma.employee.findMany({
        where: {
          isActive: true,
          departmentId: { in: departmentIds },
        },
        include: {
          department: { select: { name: true } },
          section: { select: { name: true } },
        },
        orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
      });
    }

    // 各社員の User アカウントと UserAccessKey を一括取得
    const emails = employees
      .map((e) => e.email)
      .filter((e): e is string => !!e);

    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    });
    const emailToUserId = new Map(users.map((u) => [u.email, u.id]));

    const userIds = users.map((u) => u.id);
    const existingAccess = await prisma.userAccessKey.findMany({
      where: {
        userId: { in: userIds },
        accessKeyId: accessKey.id,
      },
      select: { userId: true },
    });
    const accessSet = new Set(existingAccess.map((a) => a.userId));

    return employees.map((emp) => {
      const uid = emp.email ? emailToUserId.get(emp.email) ?? null : null;
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        departmentName: emp.department.name,
        sectionName: emp.section?.name ?? null,
        userId: uid,
        hasAccess: uid ? accessSet.has(uid) : false,
      };
    });
  }

  /**
   * アクセスの ON/OFF トグル
   */
  static async toggleAccess(
    targetUserId: string,
    enabled: boolean,
    performedBy: string,
  ): Promise<void> {
    const accessKey = await this.getOrCreateSystemAccessKey();

    if (enabled) {
      // ON: UserAccessKey 作成 (既に存在する場合はスキップ)
      await prisma.userAccessKey.upsert({
        where: {
          userId_accessKeyId: {
            userId: targetUserId,
            accessKeyId: accessKey.id,
          },
        },
        update: {},
        create: {
          userId: targetUserId,
          accessKeyId: accessKey.id,
        },
      });
    } else {
      // OFF: UserAccessKey 削除
      await prisma.userAccessKey.deleteMany({
        where: {
          userId: targetUserId,
          accessKeyId: accessKey.id,
        },
      });
    }

    await AuditService.log({
      action: "WATASU_ACCESS_TOGGLE",
      category: "MODULE",
      userId: performedBy,
      targetId: targetUserId,
      targetType: "User",
      details: { enabled },
    });
  }

  /**
   * MANAGER が対象社員を管理できるか確認
   */
  static async canManageEmployee(
    managerUserId: string,
    targetEmployeeId: string,
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: managerUserId },
    });
    if (!user?.email) return false;

    const managerEmployee = await prisma.employee.findUnique({
      where: { email: user.email },
      include: { managedDepartments: { select: { id: true } } },
    });
    if (!managerEmployee) return false;

    const departmentIds = managerEmployee.managedDepartments.map((d) => d.id);
    if (departmentIds.length === 0) return false;

    const target = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { departmentId: true },
    });
    if (!target) return false;

    return departmentIds.includes(target.departmentId);
  }
}
