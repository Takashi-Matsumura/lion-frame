/**
 * サーバーサイドXLSXパーサー
 *
 * ExcelJSを使用してXLSXファイルをパースする。
 * サーバーサイド専用（API Routeで使用）。
 */

import ExcelJS from "exceljs";
import {
  STANDARD_COLUMN_SET,
  REQUIRED_COLUMNS,
  resolveColumnHeaders,
  normalizeRow,
} from "./column-mapping";
import type { ImportRow } from "./types";

interface ParseResult {
  rows: ImportRow[];
  warnings: string[];
}

/**
 * XLSXファイルのバッファをパースし、標準カラム名に基づくImportRow配列を返す。
 *
 * @param buffer - XLSXファイルのバイナリデータ
 * @returns パース結果（行データと警告メッセージ）
 * @throws ファイルが不正、必須カラム不足の場合
 */
export async function parseXlsxBuffer(buffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    throw new Error("XLSXファイルが空またはヘッダーのみです");
  }

  // ヘッダー行（1行目）を取得
  const headerRow = worksheet.getRow(1);
  const rawHeaders: Map<number, string> = new Map();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    rawHeaders.set(colNumber, String(cell.value ?? "").trim());
  });

  if (rawHeaders.size === 0) {
    throw new Error("ヘッダー行が空です");
  }

  // エイリアス解決（旧フォーマット対応）
  const rawHeaderValues = [...rawHeaders.values()];
  const { resolved: resolvedHeaders, hasAffiliation } =
    resolveColumnHeaders(rawHeaderValues);

  // colNumber → 解決済みヘッダー名のマップを構築
  const resolvedMap = new Map<number, string>();
  const colNumbers = [...rawHeaders.keys()];
  for (let i = 0; i < colNumbers.length; i++) {
    resolvedMap.set(colNumbers[i], resolvedHeaders[i]);
  }

  // 必須カラムの検証（エイリアス解決後）
  const missingRequired = REQUIRED_COLUMNS.filter(
    (col) => !resolvedHeaders.includes(col),
  );
  if (missingRequired.length > 0) {
    throw new Error(`必須カラムが見つかりません: ${missingRequired.join(", ")}`);
  }

  // 未知のカラムを警告（標準カラムでも所属カラムでもないもの）
  const warnings: string[] = [];
  const unmapped = resolvedHeaders.filter(
    (h) => !STANDARD_COLUMN_SET.has(h) && h !== "所属" && h !== "所属コード",
  );
  if (unmapped.length > 0) {
    warnings.push(`不明なカラムは無視されました: ${unmapped.join(", ")}`);
  }

  // エイリアスが解決されたカラムがあれば通知
  const aliasResolved: string[] = [];
  for (let i = 0; i < rawHeaderValues.length; i++) {
    if (rawHeaderValues[i] !== resolvedHeaders[i]) {
      aliasResolved.push(`${rawHeaderValues[i]} → ${resolvedHeaders[i]}`);
    }
  }
  if (aliasResolved.length > 0) {
    warnings.push(
      `カラム名を自動変換しました: ${aliasResolved.join(", ")}`,
    );
  }

  // 取り込み対象カラム（標準カラム + 所属）
  const acceptableColumns = new Set([...STANDARD_COLUMN_SET, "所属"]);

  // データ行をパース（2行目以降）
  const rows: ImportRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const record: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = resolvedMap.get(colNumber);
      if (!header || !acceptableColumns.has(header)) return;

      record[header] = cellToString(cell);
    });

    // 所属カラムがある場合は本部/部/課に分割
    const normalized = normalizeRow(record, hasAffiliation);

    // 空行をスキップ（社員番号と氏名が空）
    if (!normalized.社員番号?.trim() && !normalized.氏名?.trim()) return;

    rows.push(normalized as ImportRow);
  });

  if (rows.length === 0) {
    throw new Error("XLSXファイルにデータ行が見つかりません");
  }

  return { rows, warnings };
}

/**
 * ExcelJSのセル値を文字列に変換する。
 * 日付型セルはYYYY/MM/DD形式に、それ以外はString()で変換。
 */
function cellToString(cell: ExcelJS.Cell): string {
  const value = cell.value;

  if (value === null || value === undefined) return "";

  // ExcelJSの日付型
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  }

  // ExcelJSのRichText
  if (typeof value === "object" && "richText" in value) {
    return (value as ExcelJS.CellRichTextValue).richText
      .map((rt) => rt.text)
      .join("");
  }

  // ExcelJSのFormula結果
  if (typeof value === "object" && "result" in value) {
    const result = (value as ExcelJS.CellFormulaValue).result;
    if (result instanceof Date) {
      const y = result.getFullYear();
      const m = String(result.getMonth() + 1).padStart(2, "0");
      const d = String(result.getDate()).padStart(2, "0");
      return `${y}/${m}/${d}`;
    }
    return String(result ?? "");
  }

  return String(value).trim();
}
