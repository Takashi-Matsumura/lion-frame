// リクエストからリダイレクト基準となる origin を取得する。
//
// Next.js 15 の dev server は 0.0.0.0 で bind するため、Route Handler 内で
// `new URL(request.url).origin` を使うと `http://0.0.0.0:3030` になる。これで
// `/login` にリダイレクトするとブラウザからは localhost:3030 と別オリジン
// として扱われ、WebAuthn / パスキーが発火しない（Issue #24）。
//
// 優先順位:
//   1. AUTH_URL（NextAuth 標準、ブラウザから見えるオリジンを記述する想定）
//   2. x-forwarded-proto + x-forwarded-host（AUTH_URL のホストと一致する場合のみ、
//      リバースプロキシ経由の spoofing 防止）
//   3. request からパースした origin（テスト用フォールバック）

type MinimalRequest = {
  headers: { get(name: string): string | null };
  url: string;
  nextUrl?: { origin: string };
};

export function getRequestBaseUrl(request: MinimalRequest): string {
  const authUrl = process.env.AUTH_URL;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (authUrl) {
    if (forwardedProto && forwardedHost) {
      try {
        const trustedHost = new URL(authUrl).host;
        if (forwardedHost === trustedHost) {
          return `${forwardedProto}://${forwardedHost}`;
        }
      } catch {
        // AUTH_URL が不正なら以降のフォールバックへ
      }
    }
    return authUrl.replace(/\/$/, "");
  }

  // AUTH_URL 未設定時のフォールバック（主にテスト用）
  if (request.nextUrl?.origin) return request.nextUrl.origin;
  return new URL(request.url).origin;
}
