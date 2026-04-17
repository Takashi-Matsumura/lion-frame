// OIDC Provider 定数
// 詳細設計は docs/OIDC_PROVIDER.md 参照。

export const OIDC_CODE_TTL_SECONDS = 120;
export const OIDC_AUTH_REQUEST_TTL_SECONDS = 600;
export const OIDC_DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 3600;

export function getAccessTokenTtl(): number {
  const raw = process.env.OIDC_ACCESS_TOKEN_TTL;
  if (!raw) return OIDC_DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return OIDC_DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  }
  return parsed;
}

export const OIDC_SUPPORTED_SCOPES = ["openid", "profile", "email"] as const;
export type OidcSupportedScope = (typeof OIDC_SUPPORTED_SCOPES)[number];

export const OIDC_SUPPORTED_RESPONSE_TYPES = ["code"] as const;
export const OIDC_SUPPORTED_GRANT_TYPES = ["authorization_code"] as const;
export const OIDC_SUPPORTED_CODE_CHALLENGE_METHODS = ["S256"] as const;
export const OIDC_SUPPORTED_SIGNING_ALGS = ["RS256"] as const;
export const OIDC_SUPPORTED_TOKEN_AUTH_METHODS = [
  "client_secret_basic",
  "client_secret_post",
] as const;
export const OIDC_SUPPORTED_SUBJECT_TYPES = ["public"] as const;

// Discovery で公開する標準クレーム + 独自クレーム
export const OIDC_SUPPORTED_CLAIMS = [
  "sub",
  "iss",
  "aud",
  "exp",
  "iat",
  "nonce",
  "auth_time",
  "email",
  "email_verified",
  "name",
  "picture",
  "lion:role",
  "lion:two_factor",
] as const;

// Cookie 名: OIDC 認可リクエスト handle
export const OIDC_AUTH_REQUEST_COOKIE = "oidc_auth_req";
// handle cookie の有効期限（認可コード発行までの猶予。login 経由が長引いても終わる）
export const OIDC_AUTH_REQUEST_COOKIE_MAX_AGE_SECONDS = 600;
