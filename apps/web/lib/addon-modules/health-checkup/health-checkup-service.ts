import { prisma } from "@/lib/prisma";
import type { HealthCheckupStatus, Prisma } from "@prisma/client";

// ─── Types ───

export interface CampaignInput {
  title: string;
  fiscalYear: number;
  description?: string;
  deadline?: string;
  sourceFormId?: string;
  columnMapping?: Record<string, string>;
}

export interface RecordFilters {
  status?: HealthCheckupStatus;
  departmentId?: string;
  search?: string;
}

export interface CampaignStats {
  total: number;
  notBooked: number;
  booked: number;
  completed: number;
  exempt: number;
  completionRate: number;
}

export interface DepartmentStat {
  departmentId: string;
  departmentName: string;
  total: number;
  notBooked: number;
  booked: number;
  completed: number;
  exempt: number;
}

export interface ProcessedImportRecord {
  employeeId: string; // Employee.id (DB id)
  bookingMethod?: string;
  checkupType?: string;
  preferredDates?: string[];
  rawData: Record<string, unknown>;
}

// ─── Service ───

export class HealthCheckupService {
  // ─── Campaign CRUD ───

  static async getCampaigns() {
    const campaigns = await prisma.healthCheckupCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { records: true } },
      },
    });

    // 各キャンペーンのステータス集計
    const stats = await Promise.all(
      campaigns.map(async (c) => {
        const counts = await prisma.healthCheckupRecord.groupBy({
          by: ["status"],
          where: { campaignId: c.id },
          _count: true,
        });
        const statusMap: Record<string, number> = {};
        for (const row of counts) {
          statusMap[row.status] = row._count;
        }
        return { campaignId: c.id, statusMap };
      }),
    );

    const statsMap = new Map(stats.map((s) => [s.campaignId, s.statusMap]));
    const totalEmployees = await prisma.employee.count({ where: { isActive: true } });

    return campaigns.map((c) => {
      const sm = statsMap.get(c.id) ?? {};
      const booked = (sm.COMPLETED ?? 0) + (sm.BOOKED ?? 0);
      return {
        ...c,
        recordCount: c._count.records,
        completionRate: totalEmployees > 0 ? Math.round((booked / totalEmployees) * 100) : 0,
      };
    });
  }

  static async getCampaignById(id: string) {
    return prisma.healthCheckupCampaign.findUnique({
      where: { id },
    });
  }

  static async createCampaign(data: CampaignInput, userId: string) {
    return prisma.healthCheckupCampaign.create({
      data: {
        title: data.title,
        fiscalYear: data.fiscalYear,
        description: data.description,
        deadline: data.deadline ? new Date(data.deadline + "T00:00:00+09:00") : undefined,
        sourceFormId: data.sourceFormId,
        columnMapping: data.columnMapping as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
  }

  static async updateCampaign(id: string, data: Partial<CampaignInput>) {
    const updateData: Prisma.HealthCheckupCampaignUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.fiscalYear !== undefined) updateData.fiscalYear = data.fiscalYear;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline
        ? new Date(data.deadline + "T00:00:00+09:00")
        : null;
    }
    if (data.columnMapping !== undefined) {
      updateData.columnMapping = data.columnMapping as Prisma.InputJsonValue;
    }

    return prisma.healthCheckupCampaign.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteCampaign(id: string) {
    return prisma.healthCheckupCampaign.delete({ where: { id } });
  }

  // ─── Records ───

  static async getRecords(campaignId: string, filters?: RecordFilters) {
    const where: Prisma.HealthCheckupRecordWhereInput = { campaignId };
    if (filters?.status) where.status = filters.status;
    if (filters?.departmentId) {
      where.employee = { departmentId: filters.departmentId };
    }
    if (filters?.search) {
      where.employee = {
        ...where.employee as Prisma.EmployeeWhereInput,
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { employeeId: { contains: filters.search, mode: "insensitive" } },
        ],
      };
    }

    return prisma.healthCheckupRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { employee: { employeeId: "asc" } },
    });
  }

  static async updateRecordStatus(
    recordId: string,
    status: HealthCheckupStatus,
    confirmedDate?: string,
  ) {
    const data: Prisma.HealthCheckupRecordUpdateInput = { status };
    if (confirmedDate) {
      data.confirmedDate = new Date(confirmedDate + "T00:00:00+09:00");
    }
    if (status === "NOT_BOOKED") {
      data.confirmedDate = null;
    }
    return prisma.healthCheckupRecord.update({
      where: { id: recordId },
      data,
    });
  }

  // ─── Stats ───

  static async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    // 全アクティブ社員を母数にする
    const totalEmployees = await prisma.employee.count({ where: { isActive: true } });

    const counts = await prisma.healthCheckupRecord.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: true,
    });

    const sm: Record<string, number> = {};
    for (const row of counts) {
      sm[row.status] = row._count;
    }

    const booked = sm.BOOKED ?? 0;
    const completed = sm.COMPLETED ?? 0;
    const exempt = sm.EXEMPT ?? 0;
    const recordedNotBooked = sm.NOT_BOOKED ?? 0;
    const totalRecorded = booked + completed + exempt + recordedNotBooked;
    // レコードがない社員 = 未予約
    const notBooked = totalEmployees - totalRecorded + recordedNotBooked;

    return {
      total: totalEmployees,
      notBooked,
      booked,
      completed,
      exempt,
      completionRate: totalEmployees > 0 ? Math.round(((booked + completed) / totalEmployees) * 100) : 0,
    };
  }

  static async getDepartmentStats(campaignId: string): Promise<DepartmentStat[]> {
    // 全アクティブ社員を部署名ベースで集計
    const allEmployees = await prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        department: { select: { id: true, name: true } },
      },
    });

    // キャンペーンのレコードを取得
    const records = await prisma.healthCheckupRecord.findMany({
      where: { campaignId },
      select: {
        status: true,
        employeeId: true,
      },
    });

    const recordMap = new Map(records.map((r) => [r.employeeId, r.status]));

    // 部署名ベースでグルーピング（複数組織の同名部署を統合）
    const deptMap = new Map<string, DepartmentStat>();
    for (const emp of allEmployees) {
      const deptName = emp.department.name;
      let stat = deptMap.get(deptName);
      if (!stat) {
        stat = {
          departmentId: deptName, // 名前ベースのキー
          departmentName: deptName,
          total: 0,
          notBooked: 0,
          booked: 0,
          completed: 0,
          exempt: 0,
        };
        deptMap.set(deptName, stat);
      }
      stat.total++;

      const status = recordMap.get(emp.id);
      if (!status || status === "NOT_BOOKED") stat.notBooked++;
      else if (status === "BOOKED") stat.booked++;
      else if (status === "COMPLETED") stat.completed++;
      else if (status === "EXEMPT") stat.exempt++;
    }

    return Array.from(deptMap.values()).sort((a, b) =>
      a.departmentName.localeCompare(b.departmentName, "ja"),
    );
  }

  // ─── Import ───

  static async upsertRecords(
    campaignId: string,
    records: ProcessedImportRecord[],
  ) {
    let created = 0;
    let updated = 0;

    await prisma.$transaction(
      async (tx) => {
        for (const rec of records) {
          const existing = await tx.healthCheckupRecord.findUnique({
            where: {
              campaignId_employeeId: {
                campaignId,
                employeeId: rec.employeeId,
              },
            },
          });

          if (existing) {
            await tx.healthCheckupRecord.update({
              where: { id: existing.id },
              data: {
                status: "BOOKED",
                bookingMethod: rec.bookingMethod,
                checkupType: rec.checkupType,
                preferredDates: rec.preferredDates as Prisma.InputJsonValue,
                rawData: rec.rawData as Prisma.InputJsonValue,
                importedAt: new Date(),
              },
            });
            updated++;
          } else {
            await tx.healthCheckupRecord.create({
              data: {
                campaignId,
                employeeId: rec.employeeId,
                status: "BOOKED",
                bookingMethod: rec.bookingMethod,
                checkupType: rec.checkupType,
                preferredDates: rec.preferredDates as Prisma.InputJsonValue,
                rawData: rec.rawData as Prisma.InputJsonValue,
                importedAt: new Date(),
              },
            });
            created++;
          }
        }
      },
      { timeout: 60000 },
    );

    return { created, updated, total: records.length };
  }
}
