/**
 * 日本語専用アドオンモジュール用の翻訳ヘルパー
 *
 * jaOnly モジュールでは、日本語の翻訳文字列を1回だけ定義すれば
 * en/ja 両方のキーが自動生成される。コンポーネントは既存の
 * translations[language] パターンをそのまま使える。
 *
 * @example
 * ```ts
 * import { jaOnly } from "@/lib/i18n/ja-only";
 *
 * export const myTranslations = jaOnly({
 *   title: "マイモジュール",
 *   save: "保存",
 *   cancel: "キャンセル",
 * });
 *
 * // myTranslations.en.title === "マイモジュール"
 * // myTranslations.ja.title === "マイモジュール"
 * ```
 */
export function jaOnly<T extends Record<string, string>>(
  translations: T,
): { en: T; ja: T } {
  return { en: translations, ja: translations };
}
