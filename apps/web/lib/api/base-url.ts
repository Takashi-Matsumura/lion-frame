// リクエストからリダイレクト基準となる origin を取得する。
//
// Next.js 15 の dev server は 0.0.0.0 で bind するため、Route Handler 内で
// `new URL(request.url).origin` を使うと `http://0.0.0.0:3030` になる。これで
// `/login` にリダイレクトするとブラウザからは localhost:3030 と別オリジン
// として扱われ、WebAuthn / パスキーが発火しない（Issue #24）。
//
// また AUTH_URL を `http://localhost:3000` のように固定すると、LAN IP 経由で
// アクセスしたときに callback URL が localhost に固定されてログインフローが
// 破綻する（Issue #46）。AUTH_URL を未設定にして AUTH_TRUST_HOST=true で
// 運用する場合、Host ヘッダから実アクセス先を解決する必要がある。
//
// 優先順位:
//   1. AUTH_URL（NextAuth 標準、ブラウザから見えるオリジンを記述する想定）
//   2. x-forwarded-proto + x-forwarded-host（AUTH_URL のホストと一致する場合のみ、
//      リバースプロキシ経由の spoofing 防止）
//   3. AUTH_URL 未設定時: x-forwarded-proto/host または Host ヘッダ
//   4. request からパースした origin（最終フォールバック、主にテスト用）

type MinimalRequest = {
  headers: { get(name: string): string | null };
  url: string;
  nextUrl?: { origin: string };
};

// x-forwarded-proto は http/https のみ許容する。攻撃者がリバースプロキシより
// 手前でヘッダを注入できる環境で javascript: 等の危険なスキームが
// 混入するのを防ぐ。
const ALLOWED_FORWARDED_PROTOS: ReadonlySet<string> = new Set(["http", "https"]);

export function getRequestBaseUrl(request: MinimalRequest): string {
  const authUrl = process.env.AUTH_URL;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (authUrl) {
    if (
      forwardedProto &&
      forwardedHost &&
      ALLOWED_FORWARDED_PROTOS.has(forwardedProto)
    ) {
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

  // AUTH_URL 未設定時 (AUTH_TRUST_HOST=true 運用) は Host ヘッダで
  // 実アクセス先を動的に解決する。これにより LAN IP / localhost 等
  // 複数のホスト名で同じサーバを公開できる (Issue #46)。
  const safeForwardedProto =
    forwardedProto && ALLOWED_FORWARDED_PROTOS.has(forwardedProto)
      ? forwardedProto
      : null;

  if (forwardedHost && safeForwardedProto) {
    return `${safeForwardedProto}://${forwardedHost}`;
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    return `${safeForwardedProto ?? "http"}://${hostHeader}`;
  }

  // 最終フォールバック（主にテスト用）。Issue #24 の 0.0.0.0 問題を
  // 避けるため Host ヘッダがあるリクエストでは到達しない。
  if (request.nextUrl?.origin) return request.nextUrl.origin;
  return new URL(request.url).origin;
}
