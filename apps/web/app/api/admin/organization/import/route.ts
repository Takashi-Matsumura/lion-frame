import { apiHandler, ApiError } from "@/lib/api";
import { HistoryRecorder } from "@/lib/history";
import { parseXlsxBuffer } from "@/lib/importers/organization/xlsx-parser";
import { processEmployeeDataWithDeduplication } from "@/lib/importers/organization/parser";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/admin/organization/import
 *
 * XLSXファイルをアップロードしてインポート実行
 */
export const POST = apiHandler(async (request, session) => {
  // FormDataからファイルとオプションを取得
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const organizationId = formData.get("organizationId") as string | null;
  const markMissingAsRetired =
    formData.get("markMissingAsRetired") === "true";
  const defaultEffectiveDateStr = formData.get("defaultEffectiveDate") as string | null;

  if (!file || !(file instanceof File)) {
    throw ApiError.badRequest("ファイルがアップロードされていません");
  }

  if (!file.name.endsWith(".xlsx")) {
    throw ApiError.badRequest("XLSXファイルのみ対応しています");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw ApiError.badRequest("ファイルサイズが大きすぎます（最大: 10MB）");
  }

  if (!organizationId) {
    throw ApiError.badRequest("Organization ID is required");
  }

  // ファイルのマジックバイト検証（XLSX = PKZIPヘッダー）
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  if (
    bytes.length < 4 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b ||
    bytes[2] !== 0x03 ||
    bytes[3] !== 0x04
  ) {
    throw ApiError.badRequest("不正なXLSXファイルです");
  }

  // 組織の存在確認
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw ApiError.notFound("Organization not found");
  }

  // XLSXをサーバーサイドでパース
  const { rows } = await parseXlsxBuffer(Buffer.from(arrayBuffer));

  // データを処理（重複除去を含む）
  const { employees: processedData, excludedDuplicates } =
    processEmployeeDataWithDeduplication(rows);

  // デフォルト発令日をJSTでパース（未指定時はJST今日）
  const todayJSTStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const defaultEffectiveDate = defaultEffectiveDateStr
    ? new Date(defaultEffectiveDateStr + "T00:00:00+09:00")
    : new Date(todayJSTStr + "T00:00:00+09:00");
  // 日付が不正な場合は今日にフォールバック
  if (Number.isNaN(defaultEffectiveDate.getTime())) {
    defaultEffectiveDate.setTime(new Date(todayJSTStr + "T00:00:00+09:00").getTime());
  }

  // バッチIDを生成
  const batchId = HistoryRecorder.generateBatchId();
  const changedBy = session.user.id || "system";
  const now = new Date();

  // 統計情報
  const statistics = {
    totalRecords: processedData.length,
    created: 0,
    updated: 0,
    transferred: 0,
    retired: 0,
    excludedDuplicates: excludedDuplicates.length,
    errors: 0,
  };

  // 組織構造のキャッシュ（パフォーマンス最適化）
  const departmentCache = new Map<
    string,
    { id: string; name: string; code: string | null }
  >();
  const sectionCache = new Map<
    string,
    { id: string; name: string; code: string | null }
  >();
  const courseCache = new Map<
    string,
    { id: string; name: string; code: string | null }
  >();

  // トランザクションでインポート実行（タイムアウト延長: 5分）
  await prisma.$transaction(
    async (tx) => {
      const importedIds = new Set<string>();

      // JST今日の開始時刻（サーバーTZに依存しない）
      const todayJST = new Date(todayJSTStr + "T00:00:00+09:00");

      for (const processed of processedData) {
        try {
          // 発令日を決定: CSV行の発令日 > デフォルト発令日
          const effectiveDate = processed.effectiveDate || defaultEffectiveDate;
          const isFutureEffective = effectiveDate > todayJST;

          // 本部（Department）を取得または作成（キャッシュ利用）
          const deptKey = processed.department;
          let department = departmentCache.get(deptKey);

          if (!department) {
            let dbDept = await tx.department.findFirst({
              where: {
                organizationId,
                name: processed.department,
              },
            });

            if (!dbDept) {
              dbDept = await tx.department.create({
                data: {
                  name: processed.department,
                  organizationId,
                },
              });
            }
            department = {
              id: dbDept.id,
              name: dbDept.name,
              code: dbDept.code,
            };
            departmentCache.set(deptKey, department);
          }

          // 部（Section）を取得または作成（キャッシュ利用）
          let section: {
            id: string;
            name: string;
            code: string | null;
          } | null = null;
          if (processed.section) {
            const sectKey = `${department.id}:${processed.section}`;
            section = sectionCache.get(sectKey) || null;

            if (!section) {
              let dbSect = await tx.section.findFirst({
                where: {
                  departmentId: department.id,
                  name: processed.section,
                },
              });

              if (!dbSect) {
                dbSect = await tx.section.create({
                  data: {
                    name: processed.section,
                    departmentId: department.id,
                  },
                });
              }
              section = {
                id: dbSect.id,
                name: dbSect.name,
                code: dbSect.code,
              };
              sectionCache.set(sectKey, section);
            }
          }

          // 課（Course）を取得または作成（キャッシュ利用）
          let course: {
            id: string;
            name: string;
            code: string | null;
          } | null = null;
          if (processed.course && section) {
            const courseKey = `${section.id}:${processed.course}`;
            course = courseCache.get(courseKey) || null;

            if (!course) {
              let dbCourse = await tx.course.findFirst({
                where: {
                  sectionId: section.id,
                  name: processed.course,
                },
              });

              if (!dbCourse) {
                dbCourse = await tx.course.create({
                  data: {
                    name: processed.course,
                    sectionId: section.id,
                  },
                });
              }
              course = {
                id: dbCourse.id,
                name: dbCourse.name,
                code: dbCourse.code,
              };
              courseCache.set(courseKey, course);
            }
          }

          // 既存社員を検索
          const existing = await tx.employee.findUnique({
            where: { employeeId: processed.employeeId },
            include: { department: true, section: true, course: true },
          });

          // 退職日の処理: 退職日 ≤ 今日なら退職済み、未来なら在籍中のまま
          const retirementDate = processed.retirementDate || null;
          const isRetired = retirementDate !== null && retirementDate < todayJST;

          if (existing) {
            // 既存社員を更新
            const oldDepartmentId = existing.departmentId;
            const isTransfer = oldDepartmentId !== department.id;

            // メール重複チェック（別の社員が同じメールを使用していないか）
            let emailToUse: string | null = processed.email || null;
            if (emailToUse && emailToUse !== existing.email) {
              const emailConflict = await tx.employee.findFirst({
                where: {
                  email: emailToUse,
                  id: { not: existing.id },
                },
              });
              if (emailConflict) {
                emailToUse = existing.email; // 元のメールを維持
              }
            }

            // 前の履歴のvalidToを更新
            await tx.employeeHistory.updateMany({
              where: {
                employeeId: existing.id,
                validTo: null,
              },
              data: {
                validTo: effectiveDate,
              },
            });

            // 未来の発令日の場合、Employeeテーブルは更新しない
            if (!isFutureEffective) {
              await tx.employee.update({
                where: { id: existing.id },
                data: {
                  name: processed.name,
                  nameKana: processed.nameKana,
                  email: emailToUse,
                  phone: processed.phone,
                  position: processed.position,
                  positionCode: processed.positionCode,
                  departmentId: department.id,
                  sectionId: section?.id || null,
                  courseId: course?.id || null,
                  qualificationGrade: processed.qualificationGrade,
                  qualificationGradeCode: processed.qualificationGradeCode,
                  employmentType: processed.employmentType,
                  employmentTypeCode: processed.employmentTypeCode,
                  joinDate: processed.joinDate,
                  birthDate: processed.birthDate,
                  retirementDate,
                  isActive: !isRetired,
                },
              });
            }

            // 履歴スナップショットを作成（未来日付でもHistoryには記録）
            const changeType = isRetired ? "RETIREMENT" : (isTransfer ? "TRANSFER" : "UPDATE");
            await tx.employeeHistory.create({
              data: {
                employeeId: existing.id,
                validFrom: effectiveDate,
                name: processed.name,
                nameKana: processed.nameKana,
                email: emailToUse || "",
                phone: processed.phone,
                position: processed.position,
                positionCode: processed.positionCode,
                qualificationGrade: processed.qualificationGrade,
                qualificationGradeCode: processed.qualificationGradeCode,
                employmentType: processed.employmentType,
                employmentTypeCode: processed.employmentTypeCode,
                joinDate: processed.joinDate,
                birthDate: processed.birthDate,
                retirementDate,
                isActive: !isRetired,
                organizationId,
                departmentId: department.id,
                departmentName: department.name,
                sectionId: section?.id,
                sectionName: section?.name,
                courseId: course?.id,
                courseName: course?.name,
                changeType,
                changeReason: isRetired
                  ? "インポートによる退職"
                  : isTransfer
                    ? "インポートによる異動"
                    : "インポートによる更新",
                changedBy,
              },
            });

            if (isRetired) {
              statistics.retired++;
            } else if (isTransfer) {
              statistics.transferred++;
            } else {
              statistics.updated++;
            }
          } else {
            // 新規社員を作成
            let emailToUse: string | null = processed.email || null;
            if (emailToUse) {
              const emailExists = await tx.employee.findFirst({
                where: { email: emailToUse },
              });
              if (emailExists) {
                emailToUse = null;
              }
            }

            // 未来の発令日の場合、Employeeテーブルは作成しない（Historyのみ記録）
            // ただし新規社員の場合は未来でもEmployee作成が必要（参照先がないとHistory作れない）
            const newEmployee = await tx.employee.create({
              data: {
                employeeId: processed.employeeId,
                name: isFutureEffective ? "" : processed.name, // 未来の場合は仮データ
                nameKana: isFutureEffective ? null : processed.nameKana,
                email: isFutureEffective ? null : emailToUse,
                phone: isFutureEffective ? null : processed.phone,
                position: isFutureEffective ? "一般" : processed.position,
                positionCode: isFutureEffective ? null : processed.positionCode,
                organizationId,
                departmentId: isFutureEffective ? (departmentCache.values().next().value?.id || department.id) : department.id,
                sectionId: isFutureEffective ? null : (section?.id || null),
                courseId: isFutureEffective ? null : (course?.id || null),
                qualificationGrade: isFutureEffective ? null : processed.qualificationGrade,
                qualificationGradeCode: isFutureEffective ? null : processed.qualificationGradeCode,
                employmentType: isFutureEffective ? null : processed.employmentType,
                employmentTypeCode: isFutureEffective ? null : processed.employmentTypeCode,
                joinDate: processed.joinDate,
                birthDate: isFutureEffective ? null : processed.birthDate,
                retirementDate,
                isActive: isFutureEffective ? false : !isRetired,
              },
            });

            // 入社履歴スナップショットを作成
            await tx.employeeHistory.create({
              data: {
                employeeId: newEmployee.id,
                validFrom: effectiveDate,
                name: processed.name,
                nameKana: processed.nameKana,
                email: emailToUse || "",
                phone: processed.phone,
                position: processed.position,
                positionCode: processed.positionCode,
                qualificationGrade: processed.qualificationGrade,
                qualificationGradeCode: processed.qualificationGradeCode,
                employmentType: processed.employmentType,
                employmentTypeCode: processed.employmentTypeCode,
                joinDate: processed.joinDate,
                birthDate: processed.birthDate,
                retirementDate,
                isActive: !isRetired,
                organizationId,
                departmentId: department.id,
                departmentName: department.name,
                sectionId: section?.id,
                sectionName: section?.name,
                courseId: course?.id,
                courseName: course?.name,
                changeType: "CREATE",
                changeReason: isFutureEffective
                  ? "インポートによる新規登録（未来発令）"
                  : "インポートによる新規登録",
                changedBy,
              },
            });

            statistics.created++;
          }

          importedIds.add(processed.employeeId);
        } catch (error) {
          console.error(
            `Error processing employee ${processed.employeeId}:`,
            error,
          );
          statistics.errors++;
        }
      }

      // 退職処理（オプション）
      if (markMissingAsRetired) {
        const existingEmployees = await tx.employee.findMany({
          where: {
            organizationId,
            isActive: true,
          },
          include: { department: true, section: true, course: true },
        });

        for (const existing of existingEmployees) {
          if (!importedIds.has(existing.employeeId)) {
            await tx.employeeHistory.updateMany({
              where: {
                employeeId: existing.id,
                validTo: null,
              },
              data: {
                validTo: now,
              },
            });

            await tx.employeeHistory.updateMany({
              where: {
                employeeId: existing.id,
                validTo: null,
              },
              data: {
                validTo: defaultEffectiveDate,
              },
            });

            await tx.employee.update({
              where: { id: existing.id },
              data: {
                isActive: false,
                retirementDate: defaultEffectiveDate,
              },
            });

            await tx.employeeHistory.create({
              data: {
                employeeId: existing.id,
                validFrom: defaultEffectiveDate,
                name: existing.name,
                nameKana: existing.nameKana,
                email: existing.email || "",
                phone: existing.phone,
                position: existing.position,
                positionCode: existing.positionCode,
                qualificationGrade: existing.qualificationGrade,
                qualificationGradeCode: existing.qualificationGradeCode,
                employmentType: existing.employmentType,
                employmentTypeCode: existing.employmentTypeCode,
                joinDate: existing.joinDate,
                birthDate: existing.birthDate,
                retirementDate: defaultEffectiveDate,
                isActive: false,
                organizationId,
                departmentId: existing.departmentId,
                departmentName: existing.department?.name || "",
                sectionId: existing.sectionId,
                sectionName: existing.section?.name,
                courseId: existing.courseId,
                courseName: existing.course?.name,
                changeType: "RETIREMENT",
                changeReason: "インポートデータに含まれていないため退職処理",
                changedBy,
              },
            });

            statistics.retired++;
          }
        }
      }
    },
    {
      timeout: 300000, // 5分
    },
  );

  // インポートログを記録
  await HistoryRecorder.recordChangeLog({
    entityType: "Organization",
    entityId: organizationId,
    changeType: "IMPORT",
    batchId,
    changedBy,
    changeDescription: `インポート完了: 新規${statistics.created}名, 更新${statistics.updated}名, 異動${statistics.transferred}名, 退職${statistics.retired}名, 重複除外${statistics.excludedDuplicates}名`,
  });

  await AuditService.log({
    action: "DATA_IMPORT",
    category: "SYSTEM_SETTING",
    userId: session.user.id,
    targetId: organizationId,
    targetType: "Organization",
    details: { batchId, statistics },
  });

  return {
    success: true,
    batchId,
    statistics,
  };
}, { admin: true });
