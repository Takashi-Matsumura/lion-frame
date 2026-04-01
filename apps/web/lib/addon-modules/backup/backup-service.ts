/**
 * バックアップサービス
 *
 * コアモジュールデータのバックアップ・リストア処理
 */

import { prisma } from "@/lib/prisma";
import type {
  BackupFile,
  BackupHistoryEntry,
  RestorePreviewRow,
} from "./types";
import { MODEL_NAMES, MODEL_NAMES_EN } from "./types";

/** SystemSetting でリストア時にスキップするキー */
const RESTORE_SKIP_KEYS = [
  "backup_history",
  "handson_active_session_id",
  "handson_rehearsal_session_id",
];

/** バックアップ履歴の最大保持数 */
const MAX_HISTORY_ENTRIES = 50;

export class BackupService {
  /**
   * バックアップを作成
   */
  static async createBackup(
    userId: string,
    userEmail: string,
    userName: string,
  ): Promise<{ json: string; sizeBytes: number }> {
    // 各モデルを並列取得
    const [
      systemSettings,
      positionMasters,
      organizations,
      departments,
      sections,
      courses,
      employees,
      employeeHistories,
      organizationHistories,
      changeLogs,
      managerHistories,
      users,
      permissions,
      accessKeys,
      accessKeyPermissions,
      userAccessKeys,
    ] = await Promise.all([
      prisma.systemSetting.findMany(),
      prisma.positionMaster.findMany(),
      prisma.organization.findMany(),
      prisma.department.findMany(),
      prisma.section.findMany(),
      prisma.course.findMany(),
      prisma.employee.findMany(),
      prisma.employeeHistory.findMany(),
      prisma.organizationHistory.findMany(),
      prisma.changeLog.findMany(),
      prisma.managerHistory.findMany(),
      // User: 機密情報を除外
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          role: true,
          language: true,
          timezone: true,
          systemPrompt: true,
          orgContextEnabled: true,
          lastSignInAt: true,
          forcePasswordChange: true,
          passwordExpiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.permission.findMany(),
      prisma.accessKey.findMany(),
      prisma.accessKeyPermission.findMany(),
      prisma.userAccessKey.findMany(),
    ]);

    const data = {
      systemSettings,
      positionMasters,
      organizations,
      departments,
      sections,
      courses,
      employees,
      employeeHistories,
      organizationHistories,
      changeLogs,
      managerHistories,
      users,
      permissions,
      accessKeys,
      accessKeyPermissions,
      userAccessKeys,
    };

    const modelCounts: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      modelCounts[key] = (value as unknown[]).length;
    }

    const backup: BackupFile = {
      manifest: {
        version: "1.0",
        framework: "LionFrame",
        createdAt: new Date().toISOString(),
        createdBy: userEmail,
        models: modelCounts,
      },
      data,
    };

    const json = JSON.stringify(backup, null, 2);
    const sizeBytes = new TextEncoder().encode(json).length;

    // 履歴を記録
    const totalRecords = Object.values(modelCounts).reduce((a, b) => a + b, 0);
    await this.addHistoryEntry({
      id: crypto.randomUUID(),
      createdAt: backup.manifest.createdAt,
      createdBy: userEmail,
      createdByName: userName || userEmail,
      modelCounts,
      totalRecords,
      sizeBytes,
    });

    return { json, sizeBytes };
  }

  /**
   * リストアプレビュー（現在のデータとバックアップの差分比較）
   */
  static async previewRestore(
    backup: BackupFile,
    language: "en" | "ja" = "ja",
  ): Promise<RestorePreviewRow[]> {
    // バージョンチェック
    if (backup.manifest?.version !== "1.0") {
      throw new Error("Unsupported backup version");
    }
    if (backup.manifest?.framework !== "LionFrame") {
      throw new Error("Invalid backup file");
    }

    // 現在のレコード数を取得
    const [
      systemSettingsCount,
      positionMastersCount,
      organizationsCount,
      departmentsCount,
      sectionsCount,
      coursesCount,
      employeesCount,
      employeeHistoriesCount,
      organizationHistoriesCount,
      changeLogsCount,
      managerHistoriesCount,
      usersCount,
      permissionsCount,
      accessKeysCount,
      accessKeyPermissionsCount,
      userAccessKeysCount,
    ] = await Promise.all([
      prisma.systemSetting.count(),
      prisma.positionMaster.count(),
      prisma.organization.count(),
      prisma.department.count(),
      prisma.section.count(),
      prisma.course.count(),
      prisma.employee.count(),
      prisma.employeeHistory.count(),
      prisma.organizationHistory.count(),
      prisma.changeLog.count(),
      prisma.managerHistory.count(),
      prisma.user.count(),
      prisma.permission.count(),
      prisma.accessKey.count(),
      prisma.accessKeyPermission.count(),
      prisma.userAccessKey.count(),
    ]);

    const currentCounts: Record<string, number> = {
      systemSettings: systemSettingsCount,
      positionMasters: positionMastersCount,
      organizations: organizationsCount,
      departments: departmentsCount,
      sections: sectionsCount,
      courses: coursesCount,
      employees: employeesCount,
      employeeHistories: employeeHistoriesCount,
      organizationHistories: organizationHistoriesCount,
      changeLogs: changeLogsCount,
      managerHistories: managerHistoriesCount,
      users: usersCount,
      permissions: permissionsCount,
      accessKeys: accessKeysCount,
      accessKeyPermissions: accessKeyPermissionsCount,
      userAccessKeys: userAccessKeysCount,
    };

    const names = language === "ja" ? MODEL_NAMES : MODEL_NAMES_EN;

    return Object.keys(currentCounts).map((model) => ({
      model,
      modelJa: names[model] || model,
      current: currentCounts[model],
      backup: backup.data[model as keyof typeof backup.data]?.length ?? 0,
    }));
  }

  /**
   * リストア実行（全置換方式）
   */
  static async executeRestore(
    backup: BackupFile,
    currentUserId: string,
  ): Promise<{ restoredModels: Record<string, number> }> {
    // バージョンチェック
    if (backup.manifest?.version !== "1.0") {
      throw new Error("Unsupported backup version");
    }

    const restoredModels: Record<string, number> = {};

    await prisma.$transaction(
      async (tx) => {
        // === 削除フェーズ（逆FK順） ===
        await tx.userAccessKey.deleteMany();
        await tx.accessKeyPermission.deleteMany();
        await tx.accessKey.deleteMany();
        await tx.permission.deleteMany();
        await tx.managerHistory.deleteMany();
        await tx.changeLog.deleteMany();
        await tx.organizationHistory.deleteMany();
        await tx.employeeHistory.deleteMany();
        await tx.employee.deleteMany();
        await tx.course.deleteMany();
        await tx.section.deleteMany();
        await tx.department.deleteMany();
        await tx.organization.deleteMany();
        await tx.positionMaster.deleteMany();
        // SystemSetting: スキップ対象以外を削除
        const currentSettings = await tx.systemSetting.findMany();
        for (const setting of currentSettings) {
          if (!RESTORE_SKIP_KEYS.includes(setting.key)) {
            await tx.systemSetting.delete({ where: { key: setting.key } });
          }
        }

        // === 挿入フェーズ（FK順） ===

        // SystemSettings（スキップ対象以外）
        const settingsToRestore = (backup.data.systemSettings || []).filter(
          (s) => !RESTORE_SKIP_KEYS.includes(s.key as string),
        );
        if (settingsToRestore.length > 0) {
          for (const setting of settingsToRestore) {
            await tx.systemSetting.upsert({
              where: { key: setting.key as string },
              update: { value: setting.value as string },
              create: {
                key: setting.key as string,
                value: setting.value as string,
              },
            });
          }
          restoredModels.systemSettings = settingsToRestore.length;
        }

        // PositionMaster
        if (backup.data.positionMasters?.length) {
          await tx.positionMaster.createMany({
            data: backup.data.positionMasters.map((p) => ({
              id: p.id as string,
              code: p.code as string,
              name: p.name as string,
              nameJa: p.nameJa as string,
              level: (p.level as string) || "STAFF",
              isManager: (p.isManager as boolean) || false,
              color: p.color as string | null,
              displayOrder: (p.displayOrder as number) || 0,
              approvalLevel: (p.approvalLevel as number) || 0,
              isActive: p.isActive !== false,
            })),
          });
          restoredModels.positionMasters = backup.data.positionMasters.length;
        }

        // Organization
        if (backup.data.organizations?.length) {
          await tx.organization.createMany({
            data: backup.data.organizations.map((o) => ({
              id: o.id as string,
              name: o.name as string,
              description: o.description as string | null,
              status: (o.status as "DRAFT" | "PUBLISHED") || "DRAFT",
              publishAt: o.publishAt ? new Date(o.publishAt as string) : null,
              publishedAt: o.publishedAt
                ? new Date(o.publishedAt as string)
                : null,
            })),
          });
          restoredModels.organizations = backup.data.organizations.length;
        }

        // Department（manager/executive は後で更新）
        if (backup.data.departments?.length) {
          await tx.department.createMany({
            data: backup.data.departments.map((d) => ({
              id: d.id as string,
              name: d.name as string,
              code: d.code as string | null,
              description: d.description as string | null,
              organizationId: d.organizationId as string,
              managerId: null,
              executiveId: null,
            })),
          });
          restoredModels.departments = backup.data.departments.length;
        }

        // Section（manager は後で更新）
        if (backup.data.sections?.length) {
          await tx.section.createMany({
            data: backup.data.sections.map((s) => ({
              id: s.id as string,
              name: s.name as string,
              code: s.code as string | null,
              description: s.description as string | null,
              departmentId: s.departmentId as string,
              managerId: null,
            })),
          });
          restoredModels.sections = backup.data.sections.length;
        }

        // Course（manager は後で更新）
        if (backup.data.courses?.length) {
          await tx.course.createMany({
            data: backup.data.courses.map((c) => ({
              id: c.id as string,
              name: c.name as string,
              code: c.code as string | null,
              description: c.description as string | null,
              sectionId: c.sectionId as string,
              managerId: null,
            })),
          });
          restoredModels.courses = backup.data.courses.length;
        }

        // Employee（supervisor/deputy は後で更新）
        if (backup.data.employees?.length) {
          await tx.employee.createMany({
            data: backup.data.employees.map((e) => ({
              id: e.id as string,
              employeeId: e.employeeId as string,
              name: e.name as string,
              nameKana: e.nameKana as string | null,
              email: e.email as string | null,
              profileImage: e.profileImage as string | null,
              phone: e.phone as string | null,
              position: e.position as string,
              positionCode: e.positionCode as string | null,
              qualificationGrade: e.qualificationGrade as string | null,
              qualificationGradeCode:
                e.qualificationGradeCode as string | null,
              employmentType: e.employmentType as string | null,
              employmentTypeCode: e.employmentTypeCode as string | null,
              departmentCode: e.departmentCode as string | null,
              joinDate: e.joinDate ? new Date(e.joinDate as string) : null,
              birthDate: e.birthDate ? new Date(e.birthDate as string) : null,
              retirementDate: e.retirementDate
                ? new Date(e.retirementDate as string)
                : null,
              isActive: e.isActive as boolean,
              organizationId: e.organizationId as string,
              departmentId: e.departmentId as string,
              sectionId: e.sectionId as string | null,
              courseId: e.courseId as string | null,
              supervisorId: null,
              deputyId: null,
            })),
          });

          // 2nd パス: supervisor/deputy を更新
          for (const e of backup.data.employees) {
            if (e.supervisorId || e.deputyId) {
              await tx.employee.update({
                where: { id: e.id as string },
                data: {
                  supervisorId: e.supervisorId as string | null,
                  deputyId: e.deputyId as string | null,
                },
              });
            }
          }

          restoredModels.employees = backup.data.employees.length;
        }

        // Department/Section/Course の manager/executive を更新
        for (const d of backup.data.departments || []) {
          if (d.managerId || d.executiveId) {
            await tx.department.update({
              where: { id: d.id as string },
              data: {
                managerId: d.managerId as string | null,
                executiveId: d.executiveId as string | null,
              },
            });
          }
        }
        for (const s of backup.data.sections || []) {
          if (s.managerId) {
            await tx.section.update({
              where: { id: s.id as string },
              data: { managerId: s.managerId as string | null },
            });
          }
        }
        for (const c of backup.data.courses || []) {
          if (c.managerId) {
            await tx.course.update({
              where: { id: c.id as string },
              data: { managerId: c.managerId as string | null },
            });
          }
        }

        // EmployeeHistory
        if (backup.data.employeeHistories?.length) {
          await tx.employeeHistory.createMany({
            data: backup.data.employeeHistories.map((h) => ({
              id: h.id as string,
              employeeId: h.employeeId as string,
              validFrom: new Date(h.validFrom as string),
              validTo: h.validTo ? new Date(h.validTo as string) : null,
              name: h.name as string,
              nameKana: h.nameKana as string | null,
              email: h.email as string,
              profileImage: h.profileImage as string | null,
              phone: h.phone as string | null,
              position: h.position as string,
              positionCode: h.positionCode as string | null,
              qualificationGrade: h.qualificationGrade as string | null,
              qualificationGradeCode:
                h.qualificationGradeCode as string | null,
              employmentType: h.employmentType as string | null,
              employmentTypeCode: h.employmentTypeCode as string | null,
              departmentCode: h.departmentCode as string | null,
              joinDate: h.joinDate ? new Date(h.joinDate as string) : null,
              birthDate: h.birthDate ? new Date(h.birthDate as string) : null,
              retirementDate: h.retirementDate
                ? new Date(h.retirementDate as string)
                : null,
              isActive: h.isActive as boolean,
              organizationId: h.organizationId as string,
              departmentId: h.departmentId as string,
              departmentName: h.departmentName as string,
              sectionId: h.sectionId as string | null,
              sectionName: h.sectionName as string | null,
              courseId: h.courseId as string | null,
              courseName: h.courseName as string | null,
              changeType: h.changeType as
                | "CREATE"
                | "UPDATE"
                | "DELETE"
                | "TRANSFER"
                | "PROMOTION"
                | "RETIREMENT"
                | "REJOINING"
                | "IMPORT"
                | "BULK_UPDATE"
                | "EXPORT",
              changeReason: h.changeReason as string | null,
              changedBy: h.changedBy as string,
              changedAt: new Date(h.changedAt as string),
            })),
          });
          restoredModels.employeeHistories =
            backup.data.employeeHistories.length;
        }

        // OrganizationHistory
        if (backup.data.organizationHistories?.length) {
          await tx.organizationHistory.createMany({
            data: backup.data.organizationHistories.map((h) => ({
              id: h.id as string,
              organizationId: h.organizationId as string,
              validFrom: new Date(h.validFrom as string),
              validTo: h.validTo ? new Date(h.validTo as string) : null,
              structureSnapshot: h.structureSnapshot as string,
              employeeCountSnapshot: h.employeeCountSnapshot as number,
              departmentCount: h.departmentCount as number,
              sectionCount: h.sectionCount as number,
              courseCount: h.courseCount as number,
              changeType: h.changeType as
                | "CREATE"
                | "UPDATE"
                | "DELETE"
                | "TRANSFER"
                | "PROMOTION"
                | "RETIREMENT"
                | "REJOINING"
                | "IMPORT"
                | "BULK_UPDATE"
                | "EXPORT",
              changeDescription: h.changeDescription as string | null,
              changedBy: h.changedBy as string,
              changedAt: new Date(h.changedAt as string),
            })),
          });
          restoredModels.organizationHistories =
            backup.data.organizationHistories.length;
        }

        // ChangeLog
        if (backup.data.changeLogs?.length) {
          await tx.changeLog.createMany({
            data: backup.data.changeLogs.map((l) => ({
              id: l.id as string,
              entityType: l.entityType as string,
              entityId: l.entityId as string,
              changeType: l.changeType as
                | "CREATE"
                | "UPDATE"
                | "DELETE"
                | "TRANSFER"
                | "PROMOTION"
                | "RETIREMENT"
                | "REJOINING"
                | "IMPORT"
                | "BULK_UPDATE"
                | "EXPORT",
              fieldName: l.fieldName as string | null,
              oldValue: l.oldValue as string | null,
              newValue: l.newValue as string | null,
              changeDescription: l.changeDescription as string | null,
              changeReason: l.changeReason as string | null,
              batchId: l.batchId as string | null,
              changedBy: l.changedBy as string,
              changedAt: new Date(l.changedAt as string),
              ipAddress: l.ipAddress as string | null,
              userAgent: l.userAgent as string | null,
            })),
          });
          restoredModels.changeLogs = backup.data.changeLogs.length;
        }

        // ManagerHistory
        if (backup.data.managerHistories?.length) {
          await tx.managerHistory.createMany({
            data: backup.data.managerHistories.map((m) => ({
              id: m.id as string,
              unitType: m.unitType as string,
              unitId: m.unitId as string,
              managerId: m.managerId as string | null,
              validFrom: new Date(m.validFrom as string),
              validTo: m.validTo ? new Date(m.validTo as string) : null,
              changeReason: m.changeReason as string | null,
              changedBy: m.changedBy as string,
            })),
          });
          restoredModels.managerHistories =
            backup.data.managerHistories.length;
        }

        // User（upsert: 現在のADMINセッションを保護）
        if (backup.data.users?.length) {
          let count = 0;
          for (const u of backup.data.users) {
            const isCurrentUser = u.id === currentUserId;
            await tx.user.upsert({
              where: { id: u.id },
              update: {
                name: u.name,
                email: u.email,
                role: u.role as "GUEST" | "USER" | "MANAGER" | "EXECUTIVE" | "ADMIN",
                language: u.language,
                timezone: u.timezone,
                systemPrompt: u.systemPrompt,
                orgContextEnabled: u.orgContextEnabled,
                // 現在のユーザーのパスワード関連は変更しない
                ...(isCurrentUser
                  ? {}
                  : { forcePasswordChange: true }),
              },
              create: {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role as "GUEST" | "USER" | "MANAGER" | "EXECUTIVE" | "ADMIN",
                language: u.language,
                timezone: u.timezone,
                systemPrompt: u.systemPrompt,
                orgContextEnabled: u.orgContextEnabled,
                forcePasswordChange: true,
                // パスワードなし → ログイン時にリセット必須
              },
            });
            count++;
          }
          restoredModels.users = count;
        }

        // Permission
        if (backup.data.permissions?.length) {
          await tx.permission.createMany({
            data: backup.data.permissions.map((p) => ({
              id: p.id as string,
              name: p.name as string,
              displayName: p.displayName as string,
              description: p.description as string | null,
              menuPath: p.menuPath as string,
            })),
          });
          restoredModels.permissions = backup.data.permissions.length;
        }

        // AccessKey
        if (backup.data.accessKeys?.length) {
          await tx.accessKey.createMany({
            data: backup.data.accessKeys.map((a) => ({
              id: a.id as string,
              key: a.key as string,
              name: a.name as string,
              targetUserId: a.targetUserId as string | null,
              menuPaths: a.menuPaths as string,
              expiresAt: new Date(a.expiresAt as string),
              isActive: a.isActive as boolean,
              createdBy: a.createdBy as string,
            })),
          });
          restoredModels.accessKeys = backup.data.accessKeys.length;
        }

        // AccessKeyPermission
        if (backup.data.accessKeyPermissions?.length) {
          await tx.accessKeyPermission.createMany({
            data: backup.data.accessKeyPermissions.map((p) => ({
              id: p.id as string,
              accessKeyId: p.accessKeyId as string,
              permissionId: p.permissionId as string | null,
              granularity: (p.granularity as string) || "menu",
              moduleId: p.moduleId as string | null,
              menuPath: p.menuPath as string | null,
              tabId: p.tabId as string | null,
            })),
          });
          restoredModels.accessKeyPermissions =
            backup.data.accessKeyPermissions.length;
        }

        // UserAccessKey
        if (backup.data.userAccessKeys?.length) {
          await tx.userAccessKey.createMany({
            data: backup.data.userAccessKeys.map((u) => ({
              id: u.id as string,
              userId: u.userId as string,
              accessKeyId: u.accessKeyId as string,
              activatedAt: new Date(u.activatedAt as string),
            })),
          });
          restoredModels.userAccessKeys = backup.data.userAccessKeys.length;
        }
      },
      { timeout: 300000 }, // 5分タイムアウト
    );

    return { restoredModels };
  }

  /**
   * バックアップ履歴を取得
   */
  static async getHistory(): Promise<BackupHistoryEntry[]> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "backup_history" },
    });
    if (!setting) return [];
    try {
      const entries = JSON.parse(setting.value) as BackupHistoryEntry[];
      return entries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch {
      return [];
    }
  }

  /**
   * 履歴エントリを追加
   */
  private static async addHistoryEntry(
    entry: BackupHistoryEntry,
  ): Promise<void> {
    const existing = await this.getHistory();
    const updated = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES);

    await prisma.systemSetting.upsert({
      where: { key: "backup_history" },
      update: { value: JSON.stringify(updated) },
      create: { key: "backup_history", value: JSON.stringify(updated) },
    });
  }
}
