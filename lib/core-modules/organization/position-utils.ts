/**
 * 役職表示色ユーティリティ
 *
 * PositionMaster.colorがあればそれを使用し、なければpositionNameでフォールバック
 */

/** color名 → Tailwindクラスのマッピング */
const colorClassMap: Record<string, string> = {
  purple:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  orange:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  yellow:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const defaultColor = "bg-muted text-muted-foreground";

/**
 * 役職の表示色クラスを取得
 *
 * @param positionColor - PositionMaster.colorの値（"purple", "cyan" 等）
 * @param positionName - フォールバック用の役職名
 * @returns Tailwind CSSクラス文字列
 */
export function getPositionColor(
  positionColor?: string | null,
  positionName?: string,
): string {
  // PositionMasterのcolorが設定されている場合はそれを使用
  if (positionColor && colorClassMap[positionColor]) {
    return colorClassMap[positionColor];
  }

  // フォールバック: 役職名からの推定（PositionMaster未設定時）
  if (positionName) {
    if (positionName.includes("本部長") || positionName.includes("部長")) {
      return colorClassMap.purple;
    }
    if (
      positionName.includes("課長") ||
      positionName.includes("マネージャー")
    ) {
      return colorClassMap.cyan;
    }
    if (positionName.includes("主任") || positionName.includes("リーダー")) {
      return colorClassMap.green;
    }
  }

  return defaultColor;
}
