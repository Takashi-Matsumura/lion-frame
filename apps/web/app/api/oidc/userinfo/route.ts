import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { oidcBearerError } from "@/lib/services/oidc/errors";
import {
  buildUserClaims,
  verifyAccessToken,
} from "@/lib/services/oidc/token-service";
import { checkRateLimit } from "@/lib/services/rate-limiter";

export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<NextResponse> {
  const authz = request.headers.get("authorization") ?? "";
  if (!authz.startsWith("Bearer ")) {
    return oidcBearerError("invalid_token", "Bearer token is required");
  }
  const token = authz.slice(7).trim();
  if (!token) {
    return oidcBearerError("invalid_token", "Bearer token is required");
  }

  const rl = checkRateLimit(
    `oidc-userinfo:${token.slice(-24)}`,
    600,
    60 * 1000,
  );
  if (!rl.allowed) {
    return oidcBearerError("invalid_token", "Rate limit exceeded", 429);
  }

  const verified = await verifyAccessToken(token);
  if (!verified) {
    return oidcBearerError("invalid_token", "Access token is invalid or expired");
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
  });
  if (!user) {
    return oidcBearerError("invalid_token", "user not found");
  }

  // access token 経由なので twoFactorUsed は token 発行時点のものを再現できない
  // → `lion:two_factor` は現在の 2FA 設定を基に最小限のフラグで返す
  //   （ID Token の方が正確。UserInfo は「現時点のプロフィール」を返す意味合い）
  const claims = buildUserClaims(
    user,
    verified.scope,
    user.twoFactorEnabled,
  );

  await AuditService.log({
    action: "OIDC_USERINFO_ACCESS",
    category: "OIDC",
    userId: user.id,
    targetType: "OIDCAccessToken",
    details: { clientId: verified.clientId, scope: verified.scope },
  });

  return NextResponse.json(claims, {
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
}

export const GET = handle;
export const POST = handle;
