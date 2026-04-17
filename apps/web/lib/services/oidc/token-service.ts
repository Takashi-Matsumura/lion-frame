// トークン発行・検証・PKCE 検証
// ID Token / Access Token ともに jose で RS256 署名。
// 認可コードの一回限り消費は updateMany（WHERE usedAt IS NULL）でアトミックに実現する。

import type { User } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  getAccessTokenTtl,
  OIDC_SUPPORTED_SIGNING_ALGS,
} from "./constants";
import { findKeyByKid, getActiveSigningKey } from "./keys";

function getIssuer(): string {
  const iss = process.env.OIDC_ISSUER?.replace(/\/$/, "");
  if (!iss) throw new Error("OIDC_ISSUER is not set");
  return iss;
}

function sha256Base64Url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * PKCE (S256) の code_verifier を検証する。
 * base64url(sha256(verifier)) === code_challenge
 */
export function verifyPkceS256(
  verifier: string,
  challenge: string,
): boolean {
  if (!verifier) return false;
  const computed = sha256Base64Url(verifier);
  // timing-safe equal
  if (computed.length !== challenge.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ challenge.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 認可コードを消費する（原子的に一回限り）。
 * - usedAt が null の行を今の時刻に更新
 * - 更新件数が 0 なら「見つからない or 既に消費済み」
 * 再利用を検知したら、該当クライアント×ユーザの全アクセストークンを revoke する。
 */
export async function consumeAuthCode(
  code: string,
): Promise<
  | { ok: true; row: Awaited<ReturnType<typeof prisma.oIDCAuthCode.findUnique>> }
  | { ok: false; reason: "not_found" | "expired" | "reuse" }
> {
  const existing = await prisma.oIDCAuthCode.findUnique({
    where: { id: code },
  });
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }
  if (existing.usedAt !== null) {
    // 再利用検知: この authCode で発行された既存 accessToken をすべて revoke
    await prisma.oIDCAccessToken.updateMany({
      where: {
        clientId: existing.clientId,
        userId: existing.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return { ok: false, reason: "reuse" };
  }

  // atomicに consume
  const updated = await prisma.oIDCAuthCode.updateMany({
    where: { id: code, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (updated.count !== 1) {
    // 競合した（同時に他のリクエストが消費した）
    return { ok: false, reason: "reuse" };
  }
  const row = await prisma.oIDCAuthCode.findUnique({ where: { id: code } });
  return { ok: true, row };
}

interface IdTokenClaims {
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  nonce?: string;
  auth_time?: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  "lion:role"?: string;
  "lion:two_factor"?: boolean;
}

export function buildUserClaims(
  user: User,
  scope: string,
  twoFactorUsed: boolean,
): {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  "lion:role"?: string;
  "lion:two_factor"?: boolean;
} {
  const scopes = new Set(scope.split(/\s+/).filter(Boolean));
  const claims: ReturnType<typeof buildUserClaims> = { sub: user.id };
  if (scopes.has("email") && user.email) {
    claims.email = user.email;
    claims.email_verified = !!user.emailVerified;
  }
  if (scopes.has("profile")) {
    if (user.name) claims.name = user.name;
    if (user.image) claims.picture = user.image;
    claims["lion:role"] = user.role;
    claims["lion:two_factor"] = twoFactorUsed;
  }
  return claims;
}

/** ID Token を発行（RS256 署名） */
export async function issueIdToken(input: {
  user: User;
  clientId: string; // OIDC client_id（外部向け）
  scope: string;
  nonce?: string | null;
  twoFactorUsed: boolean;
  authTime?: Date;
}): Promise<string> {
  const key = await getActiveSigningKey();
  const now = Math.floor(Date.now() / 1000);
  const userClaims = buildUserClaims(input.user, input.scope, input.twoFactorUsed);
  const payload: IdTokenClaims = {
    ...userClaims,
    sub: input.user.id,
    aud: input.clientId,
    iat: now,
    exp: now + 600, // ID Token は 10 分
    ...(input.nonce ? { nonce: input.nonce } : {}),
    ...(input.authTime
      ? { auth_time: Math.floor(input.authTime.getTime() / 1000) }
      : {}),
  };

  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "RS256", kid: key.kid, typ: "JWT" })
    .setIssuer(getIssuer())
    .sign(key.privateKey);
}

/** Access Token を発行し、ハッシュを DB に永続化する */
export async function issueAccessToken(input: {
  user: User;
  clientId: string; // OIDC client_id（外部向け）
  internalClientId: string; // OIDCClient.id
  scope: string;
}): Promise<{ token: string; expiresIn: number }> {
  const key = await getActiveSigningKey();
  const ttl = getAccessTokenTtl();
  const now = Math.floor(Date.now() / 1000);
  const jti = `at_${randomBytes(16).toString("base64url")}`;

  const token = await new SignJWT({
    scope: input.scope,
    client_id: input.clientId,
  })
    .setProtectedHeader({ alg: "RS256", kid: key.kid, typ: "at+jwt" })
    .setSubject(input.user.id)
    .setIssuer(getIssuer())
    .setAudience(input.clientId)
    .setIssuedAt(now)
    .setExpirationTime(now + ttl)
    .setJti(jti)
    .sign(key.privateKey);

  await prisma.oIDCAccessToken.create({
    data: {
      id: jti,
      clientId: input.internalClientId,
      userId: input.user.id,
      scope: input.scope,
      tokenHash: sha256Hex(token),
      expiresAt: new Date((now + ttl) * 1000),
    },
  });

  return { token, expiresIn: ttl };
}

export interface VerifiedAccessToken {
  userId: string;
  clientId: string; // OIDC client_id（外部向け）
  scope: string;
  tokenHash: string;
}

/**
 * Access Token を検証する（署名 + DB ルックアップで revoke/expire を確認）。
 */
export async function verifyAccessToken(
  token: string,
): Promise<VerifiedAccessToken | null> {
  try {
    // ヘッダから kid を取り、対応する鍵を lookup
    const [headerB64] = token.split(".");
    const header = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf-8"),
    );
    const kid = header.kid as string | undefined;
    if (!kid) return null;
    const key = await findKeyByKid(kid);
    if (!key) return null;

    const { payload } = await jwtVerify(token, key.privateKey, {
      issuer: getIssuer(),
      algorithms: OIDC_SUPPORTED_SIGNING_ALGS as unknown as string[],
    });

    const hash = sha256Hex(token);
    const row = await prisma.oIDCAccessToken.findUnique({
      where: { tokenHash: hash },
    });
    if (!row) return null;
    if (row.revokedAt) return null;
    if (row.expiresAt < new Date()) return null;

    return {
      userId: payload.sub as string,
      clientId: payload.aud as string,
      scope: (payload as { scope?: string }).scope ?? row.scope,
      tokenHash: hash,
    };
  } catch {
    return null;
  }
}
