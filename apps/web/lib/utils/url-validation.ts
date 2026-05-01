export type UrlValidationError = "empty" | "missing-scheme" | "invalid";

export type UrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; reason: UrlValidationError };

export function validateHttpUrl(value: string): UrlValidationResult {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return { ok: false, reason: "empty" };
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, reason: "missing-scheme" };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.origin === "null") return { ok: false, reason: "invalid" };
    return { ok: true, url: trimmed };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function urlValidationMessage(
  reason: UrlValidationError,
  language: "en" | "ja",
): string {
  const messages: Record<UrlValidationError, { en: string; ja: string }> = {
    empty: { en: "URL is required", ja: "URL を入力してください" },
    "missing-scheme": {
      en: "URL must start with http:// or https://",
      ja: "http:// または https:// で始まる URL を入力してください",
    },
    invalid: { en: "URL format is invalid", ja: "URL の形式が不正です" },
  };
  return messages[reason][language];
}
