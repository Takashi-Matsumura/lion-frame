/**
 * 条件ロジック評価ユーティリティ
 * フロントエンド・バックエンドで共有
 */

export interface Condition {
  fieldId: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "lt"
    | "contains"
    | "not_empty"
    | "is_empty";
  value?: unknown;
}

export interface ConditionalLogic {
  action: "show" | "hide";
  logic: "and" | "or";
  conditions: Condition[];
}

function evaluateSingle(
  condition: Condition,
  answers: Record<string, unknown>,
): boolean {
  const answer = answers[condition.fieldId];

  switch (condition.operator) {
    case "is_empty":
      return (
        answer === undefined ||
        answer === null ||
        answer === "" ||
        (Array.isArray(answer) && answer.length === 0)
      );
    case "not_empty":
      return (
        answer !== undefined &&
        answer !== null &&
        answer !== "" &&
        !(Array.isArray(answer) && answer.length === 0)
      );
    case "eq":
      return answer === condition.value;
    case "ne":
      return answer !== condition.value;
    case "gt":
      return Number(answer) > Number(condition.value);
    case "lt":
      return Number(answer) < Number(condition.value);
    case "contains": {
      if (typeof answer === "string") {
        return answer.includes(String(condition.value));
      }
      if (Array.isArray(answer)) {
        return answer.includes(condition.value);
      }
      return false;
    }
    default:
      return true;
  }
}

/**
 * 条件ロジックを評価してフィールドの表示/非表示を決定
 * @returns true = フィールドを表示する
 */
export function evaluateConditions(
  logic: ConditionalLogic | null | undefined,
  answers: Record<string, unknown>,
): boolean {
  if (!logic || !logic.conditions || logic.conditions.length === 0) {
    return true;
  }

  const results = logic.conditions.map((c) => evaluateSingle(c, answers));
  const match =
    logic.logic === "and" ? results.every(Boolean) : results.some(Boolean);

  return logic.action === "show" ? match : !match;
}
