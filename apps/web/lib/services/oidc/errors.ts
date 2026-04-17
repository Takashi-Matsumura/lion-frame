// OIDC/OAuth 2.0 エラーレスポンス生成ヘルパ
// RFC 6749 §5.2 / OIDC Core 1.0 §3.1.2.6 準拠のエラーコードを返す。

import { NextResponse } from "next/server";

export type OidcErrorCode =
  | "invalid_request"
  | "unauthorized_client"
  | "access_denied"
  | "unsupported_response_type"
  | "invalid_scope"
  | "server_error"
  | "temporarily_unavailable"
  | "invalid_client"
  | "invalid_grant"
  | "unsupported_grant_type"
  | "invalid_token"
  | "insufficient_scope"
  | "consent_required"
  | "login_required";

export class OidcError extends Error {
  constructor(
    public code: OidcErrorCode,
    public description?: string,
    public status: number = 400,
  ) {
    super(description ?? code);
  }
}

/** JSON ボディでエラーを返す（token / userinfo 用） */
export function oidcErrorJson(
  code: OidcErrorCode,
  description?: string,
  status: number = 400,
  headers?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    {
      error: code,
      ...(description ? { error_description: description } : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
        ...(headers ?? {}),
      },
    },
  );
}

/** redirect_uri にエラーをクエリ付けてリダイレクトする（authorize 用） */
export function oidcErrorRedirect(
  redirectUri: string,
  code: OidcErrorCode,
  description?: string,
  state?: string,
): NextResponse {
  const url = new URL(redirectUri);
  url.searchParams.set("error", code);
  if (description) url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString(), 302);
}

/** userinfo 向けの WWW-Authenticate ヘッダ付きエラー */
export function oidcBearerError(
  code: Extract<OidcErrorCode, "invalid_token" | "insufficient_scope">,
  description?: string,
  status: number = 401,
): NextResponse {
  const parts = [`Bearer error="${code}"`];
  if (description) parts.push(`error_description="${description}"`);
  return oidcErrorJson(code, description, status, {
    "WWW-Authenticate": parts.join(", "),
  });
}
