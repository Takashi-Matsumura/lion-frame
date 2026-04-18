// ログイン後に飛ばす callbackUrl のサニタイズ。オープンリダイレクト対策。
// - 相対パス（"/" で始まり "//" で始まらない）のみ許可。
// - "javascript:" やプロトコル付き絶対 URL、"//evil.example" などは拒否。
// - null/undefined や不正値は fallback を返す。

export function sanitizeCallbackUrl(
  input: string | null | undefined,
  fallback: string,
): string {
  if (!input) return fallback;
  try {
    const decoded = decodeURIComponent(input);
    if (!decoded.startsWith("/")) return fallback;
    if (decoded.startsWith("//")) return fallback;
    if (decoded.startsWith("/\\")) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}
