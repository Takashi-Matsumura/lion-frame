import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { changeTypeMapping } from "@/lib/history/types";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/employees/[id]/history
 *
 * 社員のキャリア履歴を取得
 *
 * クエリパラメータ:
 * - limit: 取得件数（デフォルト: 50）
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // 社員の存在確認
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        nameKana: true,
      },
    });

    if (!employee) {
      throw ApiError.notFound("Employee not found");
    }

    // 履歴を取得（時系列昇順で比較用、最終的にはdescで返す）
    const histories = await prisma.employeeHistory.findMany({
      where: { employeeId: id },
      orderBy: { validFrom: "asc" },
      take: limit,
    });

    // 変更ログも取得（フィールド単位の変更詳細）
    const changeLogs = await prisma.changeLog.findMany({
      where: {
        entityType: "Employee",
        entityId: id,
      },
      orderBy: { changedAt: "asc" },
      take: limit * 5,
    });

    // 変化なしの更新エントリをフィルタリング
    // CREATE, TRANSFER, PROMOTION, RETIREMENT, REJOINING は常に表示
    // UPDATE, IMPORT, BULK_UPDATE は前回と比較して差分がある場合のみ表示
    const noChangeFilterTypes = new Set(["UPDATE", "IMPORT", "BULK_UPDATE"]);
    const compareFields = [
      "departmentId", "departmentName", "sectionId", "sectionName",
      "courseId", "courseName", "position", "positionCode",
      "qualificationGrade", "qualificationGradeCode",
      "employmentType", "employmentTypeCode", "isActive", "retirementDate",
    ] as const;

    type HistoryRecord = typeof histories[number];
    const hasChanges = (current: HistoryRecord, previous: HistoryRecord): boolean => {
      for (const field of compareFields) {
        const cur = current[field];
        const prev = previous[field];
        // DateTime比較
        if (cur instanceof Date && prev instanceof Date) {
          if (cur.getTime() !== prev.getTime()) return true;
        } else if (String(cur ?? "") !== String(prev ?? "")) {
          return true;
        }
      }
      return false;
    };

    const filteredHistories: typeof histories = [];
    for (let i = 0; i < histories.length; i++) {
      const history = histories[i];
      if (noChangeFilterTypes.has(history.changeType) && i > 0) {
        if (!hasChanges(history, histories[i - 1])) continue;
      }
      filteredHistories.push(history);
    }

    // 最新順に並び替え
    filteredHistories.reverse();

    // 履歴をフォーマット
    const formattedHistories = filteredHistories.map((history) => {
      const relatedLogs = changeLogs.filter(
        (log) =>
          log.changedAt.getTime() >= history.validFrom.getTime() - 1000 &&
          log.changedAt.getTime() <= history.validFrom.getTime() + 1000,
      );

      return {
        id: history.id,
        validFrom: history.validFrom,
        validTo: history.validTo,
        changeType: history.changeType,
        changeTypeJa:
          changeTypeMapping[history.changeType] || history.changeType,
        changeReason: history.changeReason,
        department: history.departmentName,
        section: history.sectionName,
        course: history.courseName,
        position: history.position,
        positionCode: history.positionCode,
        qualificationGrade: history.qualificationGrade,
        qualificationGradeCode: history.qualificationGradeCode,
        employmentType: history.employmentType,
        employmentTypeCode: history.employmentTypeCode,
        isActive: history.isActive,
        changes: relatedLogs.map((log) => ({
          fieldName: log.fieldName,
          oldValue: log.oldValue,
          newValue: log.newValue,
          description: log.changeDescription,
        })),
        changedBy: history.changedBy,
        changedAt: history.changedAt,
      };
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        nameKana: employee.nameKana,
      },
      histories: formattedHistories,
      total: filteredHistories.length,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error fetching employee history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
