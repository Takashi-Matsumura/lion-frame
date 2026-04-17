import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { OIDCClientService } from "@/lib/services/oidc/client-service";
import { oidcErrorJson } from "@/lib/services/oidc/errors";
import {
  consumeAuthCode,
  issueAccessToken,
  issueIdToken,
  verifyPkceS256,
} from "@/lib/services/oidc/token-service";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limiter";

export const dynamic = "force-dynamic";

interface ClientCredentials {
  clientId: string;
  clientSecret: string;
}

function parseBasicAuth(header: string | null): ClientCredentials | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
    const idx = decoded.indexOf(":");
    if (idx === -1) return null;
    return {
      clientId: decodeURIComponent(decoded.slice(0, idx)),
      clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request);
  const rlIp = checkRateLimit(`oidc-token-ip:${ip}`, 300, 60 * 1000);
  if (!rlIp.allowed) {
    return oidcErrorJson(
      "temporarily_unavailable",
      "Too many token requests",
      429,
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return oidcErrorJson(
      "invalid_request",
      "Content-Type must be application/x-www-form-urlencoded",
    );
  }

  let body: URLSearchParams;
  try {
    const text = await request.text();
    body = new URLSearchParams(text);
  } catch {
    return oidcErrorJson("invalid_request", "Invalid form body");
  }

  const grantType = body.get("grant_type");
  if (grantType !== "authorization_code") {
    return oidcErrorJson(
      "unsupported_grant_type",
      "Only authorization_code is supported",
    );
  }

  // クライアント認証: Basic or body
  const basic = parseBasicAuth(request.headers.get("authorization"));
  const clientId = basic?.clientId ?? body.get("client_id") ?? "";
  const clientSecret = basic?.clientSecret ?? body.get("client_secret") ?? "";
  if (!clientId || !clientSecret) {
    return oidcErrorJson(
      "invalid_client",
      "client_id and client_secret are required",
      401,
    );
  }

  const rlClient = checkRateLimit(
    `oidc-token-client:${clientId}`,
    120,
    60 * 1000,
  );
  if (!rlClient.allowed) {
    return oidcErrorJson(
      "temporarily_unavailable",
      "Too many token requests for this client",
      429,
    );
  }

  const client = await OIDCClientService.verifySecret(clientId, clientSecret);
  if (!client || !client.enabled) {
    return oidcErrorJson("invalid_client", "Invalid client credentials", 401);
  }

  const code = body.get("code");
  const redirectUri = body.get("redirect_uri");
  const codeVerifier = body.get("code_verifier");

  if (!code || !redirectUri || !codeVerifier) {
    return oidcErrorJson(
      "invalid_request",
      "code, redirect_uri, code_verifier are required",
    );
  }

  const result = await consumeAuthCode(code);
  if (!result.ok) {
    if (result.reason === "reuse") {
      await AuditService.log({
        action: "OIDC_TOKEN_REUSE_DETECTED",
        category: "OIDC",
        targetId: client.id,
        targetType: "OIDCClient",
        details: { clientId: client.clientId, code },
        ipAddress: ip,
      });
    }
    return oidcErrorJson("invalid_grant", `Authorization code ${result.reason}`);
  }

  const row = result.row;
  if (!row) return oidcErrorJson("invalid_grant", "Authorization code not found");

  // redirect_uri 一致チェック（authorize 時と同じ値か）
  if (row.redirectUri !== redirectUri) {
    return oidcErrorJson("invalid_grant", "redirect_uri does not match");
  }

  // クライアント一致チェック
  if (row.clientId !== client.id) {
    return oidcErrorJson("invalid_grant", "code was not issued to this client");
  }

  // PKCE 検証
  if (row.codeChallengeMethod !== "S256") {
    return oidcErrorJson("invalid_grant", "unsupported code_challenge_method");
  }
  if (!verifyPkceS256(codeVerifier, row.codeChallenge)) {
    return oidcErrorJson("invalid_grant", "code_verifier does not match");
  }

  // User 取得
  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) {
    return oidcErrorJson("invalid_grant", "user not found");
  }

  // トークン発行
  const idToken = await issueIdToken({
    user,
    clientId: client.clientId,
    scope: row.scope,
    nonce: row.nonce,
    twoFactorUsed: row.twoFactorUsed,
    authTime: row.createdAt,
  });
  const access = await issueAccessToken({
    user,
    clientId: client.clientId,
    internalClientId: client.id,
    scope: row.scope,
  });

  await AuditService.log({
    action: "OIDC_TOKEN_ISSUE",
    category: "OIDC",
    userId: user.id,
    targetId: client.id,
    targetType: "OIDCClient",
    details: { clientId: client.clientId, scope: row.scope },
    ipAddress: ip,
  });

  return NextResponse.json(
    {
      access_token: access.token,
      token_type: "Bearer",
      expires_in: access.expiresIn,
      id_token: idToken,
      scope: row.scope,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}
