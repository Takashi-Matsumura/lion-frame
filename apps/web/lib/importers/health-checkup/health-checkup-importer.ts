import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import type {
  ImportCheckupRow,
  ImportPreview,
  MatchedRecord,
  ColumnMapping,
} from "./types";

/**
 * XLSXバッファをパースしてヘッダーと行データを返す
 */
export async function parseHealthCheckupXlsx(
  buffer: Buffer,
): Promise<{ headers: string[]; rows: ImportCheckupRow[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("ワークシートが見つかりません");

  const headers: string[] = [];
  const headerRow = sheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToString(cell);
  });

  const rows: ImportCheckupRow[] = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const obj: ImportCheckupRow = {};
    let hasData = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const cell = row.getCell(idx + 1);
      const val = cellToString(cell);
      if (val) {
        obj[h] = val;
        hasData = true;
      }
    });
    if (hasData) rows.push(obj);
  }

  return { headers: headers.filter(Boolean), rows };
}

function cellToString(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "object" && "richText" in value) {
    return (value as { richText: { text: string }[] }).richText
      .map((r) => r.text)
      .join("");
  }
  if (typeof value === "object" && "result" in value) {
    return String((value as { result: unknown }).result ?? "");
  }
  return String(value).trim();
}

/**
 * DATE_SLOTS形式の文字列をパースして日付配列に変換
 * "第1希望: 2026-06-01, 第2希望: 2026-06-15" → ["2026-06-01", "2026-06-15"]
 */
function parseDateSlots(val: string): string[] {
  if (!val) return [];
  return val
    .split(",")
    .map((part) => {
      const match = part.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : "";
    })
    .filter(Boolean);
}

/**
 * EMPLOYEE_PICKERの値から社員番号を抽出
 * "001 田中太郎" → "001"
 * JSON形式 → employeeId抽出
 */
function parseEmployeeValue(val: string): {
  employeeId?: string;
  name?: string;
} {
  if (!val) return {};

  // JSON形式の場合（フォールバック）
  try {
    const parsed = JSON.parse(val);
    if (parsed?.employeeId) {
      return { employeeId: parsed.employeeId, name: parsed.name };
    }
  } catch {
    /* not JSON */
  }

  // "社員番号 氏名" 形式
  const parts = val.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { employeeId: parts[0], name: parts.slice(1).join(" ") };
  }

  // 単一値（社員番号 or 氏名）
  return { name: val.trim() };
}

/**
 * インポートプレビューを生成
 */
export async function previewImport(
  rows: ImportCheckupRow[],
  mapping: ColumnMapping,
  campaignId?: string,
): Promise<ImportPreview> {
  const matched: MatchedRecord[] = [];
  const unmatched: { row: number; submitter: string; reason: string }[] = [];
  const duplicates: { row: number; employeeId: string; name: string }[] = [];
  const seenEmployeeIds = new Set<string>();

  // 既存レコードの社員IDセットを取得
  const existingEmployeeIds = new Set<string>();
  if (campaignId) {
    const existingRecords = await prisma.healthCheckupRecord.findMany({
      where: { campaignId },
      select: { employeeId: true },
    });
    for (const r of existingRecords) existingEmployeeIds.add(r.employeeId);
  }

  // 全社員を事前にロード
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, employeeId: true, name: true },
  });
  const byEmployeeId = new Map(employees.map((e) => [e.employeeId, e]));
  const byName = new Map(employees.map((e) => [e.name, e]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // ヘッダー行 + 0-indexed

    // 社員マッチング
    let employee: { id: string; employeeId: string; name: string } | undefined;

    // 1) EMPLOYEE_PICKERカラムからマッチ
    if (mapping.employee && row[mapping.employee]) {
      const parsed = parseEmployeeValue(row[mapping.employee]!);
      if (parsed.employeeId) {
        employee = byEmployeeId.get(parsed.employeeId);
      }
      if (!employee && parsed.name) {
        employee = byName.get(parsed.name);
      }
    }

    // 2) 「回答者」カラムでフォールバック
    if (!employee && row["回答者"]) {
      employee = byName.get(row["回答者"]);
    }

    if (!employee) {
      unmatched.push({
        row: rowNum,
        submitter: row[mapping.employee ?? ""] || row["回答者"] || "(不明)",
        reason: "社員マスタに一致する社員が見つかりません",
      });
      continue;
    }

    // 重複チェック
    if (seenEmployeeIds.has(employee.id)) {
      duplicates.push({
        row: rowNum,
        employeeId: employee.employeeId,
        name: employee.name,
      });
      continue;
    }
    seenEmployeeIds.add(employee.id);

    // レコード構築
    const bookingMethod = mapping.bookingMethod ? row[mapping.bookingMethod] : undefined;
    const isPersonal = bookingMethod === "個人予約";

    const record: MatchedRecord = {
      employeeDbId: employee.id,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      bookingMethod,
      status: isPersonal ? "BOOKED" : "PENDING",
      isExisting: existingEmployeeIds.has(employee.id),
      rawData: { ...row },
    };

    if (mapping.facility && row[mapping.facility]) {
      record.facility = row[mapping.facility];
    }
    if (mapping.checkupType && row[mapping.checkupType]) {
      record.checkupType = row[mapping.checkupType];
    }

    if (mapping.preferredDates && row[mapping.preferredDates]) {
      const dates = parseDateSlots(row[mapping.preferredDates]!);
      if (isPersonal && dates.length > 0) {
        // 個人予約: 最初の日付を確定日として設定
        record.confirmedDate = dates[0];
      } else {
        // 会社予約: 候補日として設定
        record.preferredDates = dates;
      }
    }

    matched.push(record);
  }

  return {
    matched,
    unmatched,
    duplicates,
    total: rows.length,
  };
}
