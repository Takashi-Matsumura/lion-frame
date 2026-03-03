/**
 * 組織データパーサー
 * ImportRowデータを処理済み社員データに変換
 */

import type { ImportRow, ProcessedEmployee } from "./types";

/**
 * 役員・顧問の本部名
 */
export const EXECUTIVES_DEPARTMENT_NAME = "役員・顧問";

/**
 * 日付文字列をパース（和暦対応）
 */
function parseDate(dateStr: string | number | undefined): Date | undefined {
  if (dateStr === undefined || dateStr === null || dateStr === "")
    return undefined;

  // 数値の場合（Excelシリアル日付として処理はしない — ExcelJSが変換済み）
  if (typeof dateStr === "number") return undefined;

  const strValue = String(dateStr).trim();
  if (strValue === "") return undefined;

  // 和暦パターン: R5.4.1, H30.10.5, S63.12.31
  const warekiPattern = /^([RHS])(\d+)\.(\d+)\.(\d+)$/;
  const match = strValue.match(warekiPattern);

  if (match) {
    const [, era, year, month, day] = match;
    let fullYear: number;

    switch (era) {
      case "R":
        fullYear = parseInt(year, 10) + 2018;
        break;
      case "H":
        fullYear = parseInt(year, 10) + 1988;
        break;
      case "S":
        fullYear = parseInt(year, 10) + 1925;
        break;
      default:
        return undefined;
    }

    return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10));
  }

  // 日本語形式: 1997年4月1日
  const japanesePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
  const japaneseMatch = strValue.match(japanesePattern);
  if (japaneseMatch) {
    const [, year, month, day] = japaneseMatch;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
    );
  }

  // 西暦パターン: 2023/4/1, 2023-04-01
  const slashPattern = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
  const slashMatch = strValue.match(slashPattern);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
    );
  }

  return undefined;
}

/**
 * 半角カタカナを全角カタカナに変換
 */
function convertToZenkana(str: string | undefined): string | undefined {
  if (!str) return str;

  const kanaMap: Record<string, string> = {
    ｶﾞ: "ガ",
    ｷﾞ: "ギ",
    ｸﾞ: "グ",
    ｹﾞ: "ゲ",
    ｺﾞ: "ゴ",
    ｻﾞ: "ザ",
    ｼﾞ: "ジ",
    ｽﾞ: "ズ",
    ｾﾞ: "ゼ",
    ｿﾞ: "ゾ",
    ﾀﾞ: "ダ",
    ﾁﾞ: "ヂ",
    ﾂﾞ: "ヅ",
    ﾃﾞ: "デ",
    ﾄﾞ: "ド",
    ﾊﾞ: "バ",
    ﾋﾞ: "ビ",
    ﾌﾞ: "ブ",
    ﾍﾞ: "ベ",
    ﾎﾞ: "ボ",
    ﾊﾟ: "パ",
    ﾋﾟ: "ピ",
    ﾌﾟ: "プ",
    ﾍﾟ: "ペ",
    ﾎﾟ: "ポ",
    ｳﾞ: "ヴ",
    ｱ: "ア",
    ｲ: "イ",
    ｳ: "ウ",
    ｴ: "エ",
    ｵ: "オ",
    ｶ: "カ",
    ｷ: "キ",
    ｸ: "ク",
    ｹ: "ケ",
    ｺ: "コ",
    ｻ: "サ",
    ｼ: "シ",
    ｽ: "ス",
    ｾ: "セ",
    ｿ: "ソ",
    ﾀ: "タ",
    ﾁ: "チ",
    ﾂ: "ツ",
    ﾃ: "テ",
    ﾄ: "ト",
    ﾅ: "ナ",
    ﾆ: "ニ",
    ﾇ: "ヌ",
    ﾈ: "ネ",
    ﾉ: "ノ",
    ﾊ: "ハ",
    ﾋ: "ヒ",
    ﾌ: "フ",
    ﾍ: "ヘ",
    ﾎ: "ホ",
    ﾏ: "マ",
    ﾐ: "ミ",
    ﾑ: "ム",
    ﾒ: "メ",
    ﾓ: "モ",
    ﾔ: "ヤ",
    ﾕ: "ユ",
    ﾖ: "ヨ",
    ﾗ: "ラ",
    ﾘ: "リ",
    ﾙ: "ル",
    ﾚ: "レ",
    ﾛ: "ロ",
    ﾜ: "ワ",
    ｦ: "ヲ",
    ﾝ: "ン",
    ｧ: "ァ",
    ｨ: "ィ",
    ｩ: "ゥ",
    ｪ: "ェ",
    ｫ: "ォ",
    ｯ: "ッ",
    ｬ: "ャ",
    ｭ: "ュ",
    ｮ: "ョ",
    ｰ: "ー",
  };

  let result = str;

  // 濁点・半濁点付きの文字を優先的に変換（2文字パターン）
  for (const key of Object.keys(kanaMap)) {
    if (key.length === 2) {
      result = result.replace(new RegExp(key, "g"), kanaMap[key]);
    }
  }

  // 単体の文字を変換（1文字パターン）
  for (const key of Object.keys(kanaMap)) {
    if (key.length === 1) {
      result = result.replace(new RegExp(key, "g"), kanaMap[key]);
    }
  }

  return result;
}

/**
 * ImportRowデータを処理済み社員データに変換
 */
export function processEmployeeData(rows: ImportRow[]): ProcessedEmployee[] {
  return rows
    .filter((row) => {
      // 社員番号と氏名は必須
      return !!row.社員番号?.trim() && !!row.氏名?.trim();
    })
    .map((row) => {
      const department = row.本部?.trim() || "未分類";
      const section = row.部?.trim() || undefined;
      const course = row.課?.trim() || undefined;
      const position = row.役職?.trim() || "一般";

      return {
        employeeId: row.社員番号!.trim(),
        name: row.氏名!.trim(),
        nameKana: convertToZenkana(row.氏名カナ?.trim()),
        email: row.メールアドレス?.trim() || "",
        department,
        section,
        course,
        position,
        positionCode: row.役職コード?.trim(),
        phone: row.電話番号?.trim(),
        joinDate: parseDate(row.入社日),
        birthDate: parseDate(row.生年月日),
        qualificationGrade: row.資格等級?.trim(),
        qualificationGradeCode: row.資格等級コード?.trim(),
        employmentType: row.雇用区分?.trim(),
        employmentTypeCode: row.雇用区分コード?.trim(),
        effectiveDate: parseDate(row.発令日),
        retirementDate: parseDate(row.退職日),
      };
    });
}

/**
 * 除外された重複社員の情報
 */
export interface ExcludedDuplicate {
  employee: ProcessedEmployee;
  reason: string;
  keptEmployeeId: string;
}

/**
 * 重複除去を含む処理結果
 */
export interface ProcessedDataWithDuplicates {
  employees: ProcessedEmployee[];
  excludedDuplicates: ExcludedDuplicate[];
}

/**
 * ImportRowデータを処理し、重複を除去
 * 同一社員番号がある場合、最初に出現したものを残す
 */
export function processEmployeeDataWithDeduplication(
  rows: ImportRow[],
): ProcessedDataWithDuplicates {
  const processed = processEmployeeData(rows);
  const excludedDuplicates: ExcludedDuplicate[] = [];

  // 社員番号で重複検出
  const seen = new Map<string, ProcessedEmployee>();
  const deduped: ProcessedEmployee[] = [];

  for (const emp of processed) {
    const existing = seen.get(emp.employeeId);
    if (existing) {
      excludedDuplicates.push({
        employee: emp,
        reason: "社員番号の重複",
        keptEmployeeId: existing.employeeId,
      });
    } else {
      seen.set(emp.employeeId, emp);
      deduped.push(emp);
    }
  }

  return {
    employees: deduped,
    excludedDuplicates,
  };
}
