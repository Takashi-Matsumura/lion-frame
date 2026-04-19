import { isCommonPassword } from "./common-passwords";

export const MIN_PASSWORD_LENGTH = 12;
export const RECOMMENDED_PASSWORD_LENGTH = 16;

export type ValidationError =
  | "TOO_SHORT"
  | "BLACKLISTED"
  | "CONTAINS_USER_INFO"
  | "REPEATED_CHARS";

export type PasswordStrength = "weak" | "medium" | "strong";

export type ValidationResult = {
  valid: boolean;
  strength: PasswordStrength;
  errors: ValidationError[];
};

export type UserContext = {
  email?: string | null;
  name?: string | null;
};

const REPEAT_THRESHOLD = 4;
const USER_INFO_MIN_FRAGMENT = 3;

export function validatePassword(
  password: string,
  userContext: UserContext = {},
): ValidationResult {
  const errors: ValidationError[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push("TOO_SHORT");
  }

  if (isCommonPassword(password)) {
    errors.push("BLACKLISTED");
  }

  if (containsUserInfo(password, userContext)) {
    errors.push("CONTAINS_USER_INFO");
  }

  if (hasRepeatedChars(password, REPEAT_THRESHOLD)) {
    errors.push("REPEATED_CHARS");
  }

  const strength = calculateStrength(password, errors);
  return { valid: errors.length === 0, strength, errors };
}

/**
 * パスワードに含まれるユーザ固有情報を検出
 * - email の `@` より前（ローカル部）と 3 文字以上連続一致
 * - name と 3 文字以上連続一致
 * すべて小文字化して比較する。
 */
function containsUserInfo(password: string, ctx: UserContext): boolean {
  const pw = password.toLowerCase();
  const fragments: string[] = [];

  if (ctx.email) {
    const local = ctx.email.split("@", 1)[0]?.toLowerCase();
    if (local && local.length >= USER_INFO_MIN_FRAGMENT) {
      fragments.push(local);
    }
  }
  if (ctx.name) {
    const name = ctx.name.toLowerCase().replace(/\s+/g, "");
    if (name.length >= USER_INFO_MIN_FRAGMENT) {
      fragments.push(name);
    }
  }

  for (const fragment of fragments) {
    // fragment が 3 文字以上の連続部分と一致するか
    for (let i = 0; i <= fragment.length - USER_INFO_MIN_FRAGMENT; i++) {
      const sub = fragment.slice(i, i + USER_INFO_MIN_FRAGMENT);
      if (pw.includes(sub)) return true;
    }
  }
  return false;
}

function hasRepeatedChars(password: string, threshold: number): boolean {
  let streak = 1;
  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      streak += 1;
      if (streak >= threshold) return true;
    } else {
      streak = 1;
    }
  }
  return false;
}

function calculateStrength(
  password: string,
  errors: ValidationError[],
): PasswordStrength {
  if (errors.length > 0) return "weak";
  const charTypes = countCharTypes(password);
  if (password.length >= 16 && charTypes >= 3) return "strong";
  return "medium";
}

function countCharTypes(password: string): number {
  let count = 0;
  if (/[a-z]/.test(password)) count++;
  if (/[A-Z]/.test(password)) count++;
  if (/[0-9]/.test(password)) count++;
  if (/[^a-zA-Z0-9]/.test(password)) count++;
  return count;
}
