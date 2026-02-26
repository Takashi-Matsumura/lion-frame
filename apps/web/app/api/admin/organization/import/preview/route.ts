import { apiHandler, ApiError } from "@/lib/api";
import { parseXlsxBuffer } from "@/lib/importers/organization/xlsx-parser";
import { processEmployeeDataWithDeduplication } from "@/lib/importers/organization/parser";
import type {
  ExcludedDuplicateInfo,
  FieldChange,
  PreviewResult,
} from "@/lib/importers/organization/types";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/admin/organization/import/preview
 *
 * XLSXファイルをアップロードしてインポートプレビュー（差分確認）を取得
 */
export const POST = apiHandler(async (request) => {
  // FormDataからファイルと組織IDを取得
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const organizationId = formData.get("organizationId") as string | null;

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
  const { rows, warnings } = await parseXlsxBuffer(
    Buffer.from(arrayBuffer),
  );

  // データを処理（重複除去を含む）
  const { employees: processedData, excludedDuplicates } =
    processEmployeeDataWithDeduplication(rows);

  // 除外された重複社員の情報を変換
  const excludedDuplicateInfos: ExcludedDuplicateInfo[] =
    excludedDuplicates.map((dup) => ({
      employeeId: dup.employee.employeeId,
      name: dup.employee.name,
      position: dup.employee.position,
      reason: dup.reason,
      keptEmployeeId: dup.keptEmployeeId,
    }));

  // 既存社員を取得
  const existingEmployees = await prisma.employee.findMany({
    where: { organizationId },
    include: {
      department: true,
      section: true,
      course: true,
    },
  });

  const existingMap = new Map(
    existingEmployees.map((emp) => [emp.employeeId, emp]),
  );
  const importedIds = new Set(processedData.map((p) => p.employeeId));

  // プレビュー結果を構築
  const preview: PreviewResult = {
    totalRecords: processedData.length,
    newEmployees: [],
    updatedEmployees: [],
    transferredEmployees: [],
    retiredEmployees: [],
    excludedDuplicates: excludedDuplicateInfos,
    errors: [],
  };

  for (const processed of processedData) {
    const existing = existingMap.get(processed.employeeId);

    if (!existing) {
      preview.newEmployees.push(processed);
    } else {
      // 既存社員 - 変更を検出
      const changes: FieldChange[] = [];

      const fieldMappings: {
        field: keyof typeof processed;
        fieldJa: string;
        existingField: keyof typeof existing;
      }[] = [
        { field: "name", fieldJa: "氏名", existingField: "name" },
        {
          field: "nameKana",
          fieldJa: "氏名カナ",
          existingField: "nameKana",
        },
        { field: "email", fieldJa: "メールアドレス", existingField: "email" },
        { field: "phone", fieldJa: "電話番号", existingField: "phone" },
        { field: "position", fieldJa: "役職", existingField: "position" },
        {
          field: "positionCode",
          fieldJa: "役職コード",
          existingField: "positionCode",
        },
        {
          field: "qualificationGrade",
          fieldJa: "資格等級",
          existingField: "qualificationGrade",
        },
        {
          field: "qualificationGradeCode",
          fieldJa: "資格等級コード",
          existingField: "qualificationGradeCode",
        },
        {
          field: "employmentType",
          fieldJa: "雇用区分",
          existingField: "employmentType",
        },
        {
          field: "employmentTypeCode",
          fieldJa: "雇用区分コード",
          existingField: "employmentTypeCode",
        },
      ];

      for (const mapping of fieldMappings) {
        const oldValue = existing[mapping.existingField] ?? "";
        const newValue = processed[mapping.field] ?? "";
        if (String(oldValue) !== String(newValue)) {
          changes.push({
            fieldName: mapping.field,
            fieldNameJa: mapping.fieldJa,
            oldValue: String(oldValue),
            newValue: String(newValue),
          });
        }
      }

      // 所属変更の検出
      const oldDepartment = existing.department?.name || "";
      const newDepartment = processed.department || "";
      const oldSection = existing.section?.name || "";
      const newSection = processed.section || "";
      const oldCourse = existing.course?.name || "";
      const newCourse = processed.course || "";

      if (oldDepartment !== newDepartment) {
        preview.transferredEmployees.push({
          employee: processed,
          oldDepartment,
          newDepartment,
        });
      } else if (oldSection !== newSection || oldCourse !== newCourse) {
        preview.transferredEmployees.push({
          employee: processed,
          oldDepartment:
            `${oldDepartment}/${oldSection}/${oldCourse}`.replace(
              /\/+$/,
              "",
            ),
          newDepartment:
            `${newDepartment}/${newSection}/${newCourse}`.replace(
              /\/+$/,
              "",
            ),
        });
      }

      if (changes.length > 0) {
        preview.updatedEmployees.push({
          employee: processed,
          changes,
        });
      }
    }
  }

  // 退職社員の検出
  for (const existing of existingEmployees) {
    if (existing.isActive && !importedIds.has(existing.employeeId)) {
      preview.retiredEmployees.push({
        employeeId: existing.employeeId,
        name: existing.name,
        department: existing.department?.name || "",
      });
    }
  }

  return {
    preview,
    warnings,
    summary: {
      new: preview.newEmployees.length,
      updated: preview.updatedEmployees.length,
      transferred: preview.transferredEmployees.length,
      retired: preview.retiredEmployees.length,
      errors: preview.errors.length,
    },
  };
}, { admin: true });
