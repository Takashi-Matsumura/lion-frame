import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import type { AccessKey, Role } from "@prisma/client";

/** アクセス有効期限: 12時間 */
const ACCESS_TTL_MS = 12 * 60 * 60 * 1000;

export interface EmployeeAccessInfo {
  employeeId: string;
  employeeName: string;
  departmentName: string;
  sectionName: string | null;
  userId: string | null;
  hasAccess: boolean;
  expiresAt: string | null;
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
   * 部門メンバー一覧 + モバイル転送アクセス状態を取得
   * activatedAt から12時間経過したものは期限切れとして自動削除
   */
  static async getEmployeesWithAccessStatus(
    userId: string,
    role: Role,
  ): Promise<EmployeeAccessInfo[]> {
    const accessKey = await this.getOrCreateSystemAccessKey();

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
      select: { userId: true, activatedAt: true, id: true },
    });

    // 期限切れを自動削除
    const now = new Date();
    const expiredIds: string[] = [];
    const activeAccess = new Map<string, Date>();

    for (const access of existingAccess) {
      const expiresAt = new Date(access.activatedAt.getTime() + ACCESS_TTL_MS);
      if (expiresAt <= now) {
        expiredIds.push(access.id);
      } else {
        activeAccess.set(access.userId, expiresAt);
      }
    }

    if (expiredIds.length > 0) {
      await prisma.userAccessKey.deleteMany({
        where: { id: { in: expiredIds } },
      });
    }

    return employees.map((emp) => {
      const uid = emp.email ? emailToUserId.get(emp.email) ?? null : null;
      const expiresAt = uid ? activeAccess.get(uid) ?? null : null;
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        departmentName: emp.department.name,
        sectionName: emp.section?.name ?? null,
        userId: uid,
        hasAccess: expiresAt !== null,
        expiresAt: expiresAt?.toISOString() ?? null,
      };
    });
  }

  /**
   * アクセスの ON/OFF トグル
   * ON: activatedAt を現在時刻にリセット（12時間カウント開始）
   */
  static async toggleAccess(
    targetUserId: string,
    enabled: boolean,
    performedBy: string,
  ): Promise<void> {
    const accessKey = await this.getOrCreateSystemAccessKey();

    if (enabled) {
      await prisma.userAccessKey.upsert({
        where: {
          userId_accessKeyId: {
            userId: targetUserId,
            accessKeyId: accessKey.id,
          },
        },
        update: { activatedAt: new Date() },
        create: {
          userId: targetUserId,
          accessKeyId: accessKey.id,
        },
      });
    } else {
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
