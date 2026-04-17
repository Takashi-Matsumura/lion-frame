import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifySignedValue } from "@/lib/services/cookie-signer";
import { AuditService } from "@/lib/services/audit-service";
import { OIDCConsentService } from "@/lib/services/oidc/consent-service";
import { OIDC_AUTH_REQUEST_COOKIE } from "@/lib/services/oidc/constants";
import { getClientIp } from "@/lib/services/rate-limiter";

export const dynamic = "force-dynamic";

function clearAuthRequestCookieHeader(): string {
  return `${OIDC_AUTH_REQUEST_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 },
    );
  }

  let body: { handle?: string; approve?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 400 },
    );
  }

  // handle は cookie から取るのが基本。body.handle はクライアント側の保険。
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${OIDC_AUTH_REQUEST_COOKIE}=`));
  const signed = cookieMatch
    ? decodeURIComponent(cookieMatch.split("=", 2)[1] ?? "")
    : null;
  const cookieHandle = signed ? await verifySignedValue(signed) : null;
  const handle = cookieHandle ?? body.handle ?? null;

  if (!handle) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "auth request handle missing" },
      { status: 400 },
    );
  }

  const authRequest = await OIDCConsentService.getAuthRequest(handle);
  if (!authRequest) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "auth request expired" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);

  // 拒否
  if (body.approve !== true) {
    await OIDCConsentService.deleteAuthRequest(authRequest.id);
    await AuditService.log({
      action: "OIDC_AUTHORIZE_DENIED",
      category: "OIDC",
      userId: session.user.id,
      targetId: authRequest.client.id,
      targetType: "OIDCClient",
      details: { reason: "user_denied", scope: authRequest.scope },
      ipAddress: ip,
    });
    const redirect = new URL(authRequest.redirectUri);
    redirect.searchParams.set("error", "access_denied");
    redirect.searchParams.set(
      "error_description",
      "User denied the authorization request",
    );
    if (authRequest.state) redirect.searchParams.set("state", authRequest.state);
    return NextResponse.json(
      { redirectTo: redirect.toString() },
      { status: 200, headers: { "Set-Cookie": clearAuthRequestCookieHeader() } },
    );
  }

  // 許可ロール再チェック（authorize 時から変わっている可能性）
  if (!(authRequest.client.allowedRoles as string[]).includes(session.user.role)) {
    await OIDCConsentService.deleteAuthRequest(authRequest.id);
    const redirect = new URL(authRequest.redirectUri);
    redirect.searchParams.set("error", "access_denied");
    if (authRequest.state) redirect.searchParams.set("state", authRequest.state);
    return NextResponse.json(
      { redirectTo: redirect.toString() },
      { status: 200, headers: { "Set-Cookie": clearAuthRequestCookieHeader() } },
    );
  }

  // 2FA 状態を判定（ID Token のクレーム用）
  let twoFactorUsed = false;
  if (session.user.twoFactorEnabled) {
    const twoFactorCookie = cookieHeader
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("2fa_verified="));
    if (twoFactorCookie) {
      const signedTf = decodeURIComponent(
        twoFactorCookie.split("=", 2)[1] ?? "",
      );
      const verifiedUserId = await verifySignedValue(signedTf);
      twoFactorUsed = verifiedUserId === session.user.id;
    }
  }

  // 同意を保存
  await OIDCConsentService.upsertConsent({
    clientId: authRequest.client.id,
    userId: session.user.id,
    scope: authRequest.scope,
    autoApproved: false,
  });

  await AuditService.log({
    action: "OIDC_CONSENT_GRANT",
    category: "OIDC",
    userId: session.user.id,
    targetId: authRequest.client.id,
    targetType: "OIDCClient",
    details: { scope: authRequest.scope, auto: false },
    ipAddress: ip,
  });

  // 認可コードを発行
  const authCode = await OIDCConsentService.issueAuthCode({
    clientId: authRequest.client.id,
    userId: session.user.id,
    redirectUri: authRequest.redirectUri,
    scope: authRequest.scope,
    nonce: authRequest.nonce,
    codeChallenge: authRequest.codeChallenge,
    codeChallengeMethod: authRequest.codeChallengeMethod,
    twoFactorUsed,
  });

  await AuditService.log({
    action: "OIDC_AUTHORIZE",
    category: "OIDC",
    userId: session.user.id,
    targetId: authRequest.client.id,
    targetType: "OIDCClient",
    details: {
      clientId: authRequest.client.clientId,
      scope: authRequest.scope,
      auto: false,
    },
    ipAddress: ip,
  });

  await OIDCConsentService.deleteAuthRequest(authRequest.id);

  const redirect = new URL(authRequest.redirectUri);
  redirect.searchParams.set("code", authCode.id);
  if (authRequest.state) redirect.searchParams.set("state", authRequest.state);

  return NextResponse.json(
    { redirectTo: redirect.toString() },
    { status: 200, headers: { "Set-Cookie": clearAuthRequestCookieHeader() } },
  );
}
