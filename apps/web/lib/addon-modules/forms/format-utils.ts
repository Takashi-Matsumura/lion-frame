/**
 * フォーム回答値のフォーマットユーティリティ
 *
 * サーバ（XLSXエクスポート）とクライアント（表示・AI分析）の両方で使用。
 */

const OTHER_VALUE = "__other__";

/**
 * フォーム回答値を表示用文字列にフォーマットする
 *
 * @param value - 回答値（string, boolean, string[], number, JSON等）
 * @param fieldType - フィールドタイプ（YES_NO, EMPLOYEE_PICKER, DATE_SLOTS等）
 * @param options - フォーマットオプション
 * @returns フォーマット済み文字列
 */
export function formatFormValue(
  value: unknown,
  fieldType?: string,
  options?: { emptyValue?: string },
): string {
  const empty = options?.emptyValue ?? "";

  if (value === null || value === undefined || value === "") return empty;

  // YES_NO
  if (fieldType === "YES_NO") {
    return value === true || value === "true" ? "はい" : "いいえ";
  }

  // EMPLOYEE_PICKER — JSON or "社員番号 氏名" format
  if (fieldType === "EMPLOYEE_PICKER" && typeof value === "string") {
    try {
      const emp = JSON.parse(value);
      if (emp?.employeeId && emp?.name) return `${emp.employeeId} ${emp.name}`;
      if (emp?.name) return emp.name;
    } catch {
      /* not JSON, return as-is */
    }
    return value;
  }

  // DATE_SLOTS — string[] → "第1希望: 2026-06-01, 第2希望: ..."
  if (fieldType === "DATE_SLOTS" && Array.isArray(value)) {
    return value
      .map((v, i) => (v ? `第${i + 1}希望: ${v}` : ""))
      .filter(Boolean)
      .join(", ");
  }

  // Boolean（fieldType不明の場合のフォールバック）
  if (value === true) return "はい";
  if (value === false) return "いいえ";

  // Array（CHECKBOX_GROUP, MULTI_SELECT等）
  if (Array.isArray(value)) {
    return value.filter((v) => v !== OTHER_VALUE).join(", ");
  }

  // その他選択肢
  if (value === OTHER_VALUE) return "その他";

  return String(value);
}
