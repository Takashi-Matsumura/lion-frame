import { prisma } from "@/lib/prisma";

type UnitType = "department" | "section" | "course";

interface RecordManagerChangeParams {
  unitType: UnitType;
  unitId: string;
  managerId: string | null;
  effectiveDate: Date;
  changeReason?: string;
  changedBy: string;
}

/**
 * 責任者履歴を管理するサービス
 *
 * 部署（department/section/course）の責任者変更を時系列で記録し、
 * 任意の基準日時点の責任者を復元できるようにする。
 */
export class ManagerHistoryService {
  /**
   * 責任者変更を記録
   * - 既存レコードの validTo を閉じてから新レコードを作成
   */
  static async recordManagerChange(params: RecordManagerChangeParams) {
    const { unitType, unitId, managerId, effectiveDate, changeReason, changedBy } = params;

    // 現在有効なレコードの validTo を閉じる
    await prisma.managerHistory.updateMany({
      where: {
        unitType,
        unitId,
        validTo: null,
      },
      data: {
        validTo: effectiveDate,
      },
    });

    // 新レコードを作成
    return prisma.managerHistory.create({
      data: {
        unitType,
        unitId,
        managerId,
        validFrom: effectiveDate,
        validTo: null,
        changeReason,
        changedBy,
      },
    });
  }

  /**
   * 指定日時点の全ユニットの責任者を一括取得
   * @returns Map<"unitType:unitId", managerId | null>
   */
  static async getManagersAtDate(date: Date): Promise<Map<string, string | null>> {
    const records = await prisma.managerHistory.findMany({
      where: {
        validFrom: { lte: date },
        OR: [
          { validTo: null },
          { validTo: { gt: date } },
        ],
      },
    });

    const map = new Map<string, string | null>();
    for (const record of records) {
      map.set(`${record.unitType}:${record.unitId}`, record.managerId);
    }
    return map;
  }

  /**
   * 現在の managerId 値から初期レコードを生成（マイグレーション用）
   * 既にレコードが存在する場合はスキップ
   */
  static async seedFromCurrentState() {
    const existing = await prisma.managerHistory.count();
    if (existing > 0) return { skipped: true, created: 0 };

    const now = new Date();
    const records: {
      unitType: UnitType;
      unitId: string;
      managerId: string | null;
    }[] = [];

    // Department
    const departments = await prisma.department.findMany({
      select: { id: true, managerId: true },
    });
    for (const dept of departments) {
      records.push({ unitType: "department", unitId: dept.id, managerId: dept.managerId });
    }

    // Section
    const sections = await prisma.section.findMany({
      select: { id: true, managerId: true },
    });
    for (const sect of sections) {
      records.push({ unitType: "section", unitId: sect.id, managerId: sect.managerId });
    }

    // Course
    const courses = await prisma.course.findMany({
      select: { id: true, managerId: true },
    });
    for (const course of courses) {
      records.push({ unitType: "course", unitId: course.id, managerId: course.managerId });
    }

    // 一括作成
    if (records.length > 0) {
      await prisma.managerHistory.createMany({
        data: records.map((r) => ({
          unitType: r.unitType,
          unitId: r.unitId,
          managerId: r.managerId,
          validFrom: now,
          validTo: null,
          changeReason: "初期データ移行",
          changedBy: "system",
        })),
      });
    }

    return { skipped: false, created: records.length };
  }
}
