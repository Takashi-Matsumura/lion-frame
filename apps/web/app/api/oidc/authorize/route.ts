import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifySignedValue } from "@/lib/services/cookie-signer";
import { AuditService } from "@/lib/services/audit-service";
import { OIDCClientService } from "@/lib/services/oidc/client-service";
import { OIDCConsentService } from "@/lib/services/oidc/consent-service";
import {
  OIDC_AUTH_REQUEST_COOKIE,
  OIDC_AUTH_REQUEST_COOKIE_MAX_AGE_SECONDS,
  OIDC_SUPPORTED_CODE_CHALLENGE_METHODS,
  OIDC_SUPPORTED_RESPONSE_TYPES,
} from "@/lib/services/oidc/constants";
import { oidcErrorRedirect } from "@/lib/services/oidc/errors";
import { getSigningKeyStatus } from "@/lib/services/oidc/keys";
import { signValue } from "@/lib/services/cookie-signer";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limiter";

export const dynamic = "force-dynamic";

function jsonError(
  code: string,
  description: string,
  status = 400,
): NextResponse {
  return NextResponse.json(
    { error: code, error_description: description },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function resolveAuthRequestId(
  request: Request,
  resumeParam: string | null,
): Promise<string | null> {
  if (resumeParam) return resumeParam;
  // cookie からフォールバック
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${OIDC_AUTH_REQUEST_COOKIE}=`));
  if (!match) return null;
  const signed = decodeURIComponent(match.split("=", 2)[1] ?? "");
  return await verifySignedValue(signed);
}

async function buildAuthRequestCookie(handle: string): Promise<string> {
  const signed = await signValue(handle);
  return [
    `${OIDC_AUTH_REQUEST_COOKIE}=${encodeURIComponent(signed)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${OIDC_AUTH_REQUEST_COOKIE_MAX_AGE_SECONDS}`,
  ].join("; ");
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Rate limit: IP 単位
  const ip = getClientIp(request);
  const rl = checkRateLimit(`oidc-auth:${ip}`, 60, 10 * 60 * 1000);
  if (!rl.allowed) {
    return jsonError(
      "temporarily_unavailable",
      "Too many authorization requests",
      429,
    );
  }

  // Resume フロー: 既存の AuthRequest を handle で復帰
  const resume = params.get("resume");
  const existingHandle = await resolveAuthRequestId(request, resume);

  let authRequestClient: Awaited<
    ReturnType<typeof OIDCConsentService.getAuthRequest>
  > = null;

  if (existingHandle) {
    authRequestClient = await OIDCConsentService.getAuthRequest(existingHandle);
  }

  let clientRow: Awaited<ReturnType<typeof OIDCClientService.getByClientId>> =
    null;
  let redirectUri: string;
  let scope: string;
  let state: string | null;
  let nonce: string | null;
  let codeChallenge: string;
  let codeChallengeMethod: string;
  let responseType: string;

  if (authRequestClient) {
    // 保存済みの AuthRequest から復元（機微パラメータは DB から）
    clientRow = authRequestClient.client;
    redirectUri = authRequestClient.redirectUri;
    scope = authRequestClient.scope;
    state = authRequestClient.state;
    nonce = authRequestClient.nonce;
    codeChallenge = authRequestClient.codeChallenge;
    codeChallengeMethod = authRequestClient.codeChallengeMethod;
    responseType = authRequestClient.responseType;
  } else {
    // 新規リクエスト: パラメータから構築
    const clientId = params.get("client_id");
    redirectUri = params.get("redirect_uri") ?? "";
    responseType = params.get("response_type") ?? "";
    scope = params.get("scope") ?? "";
    state = params.get("state");
    nonce = params.get("nonce");
    codeChallenge = params.get("code_challenge") ?? "";
    codeChallengeMethod = params.get("code_challenge_method") ?? "";

    // redirect_uri を先に検証（以降のエラーはここにリダイレクト可）
    if (!clientId) {
      return jsonError("invalid_request", "client_id is required");
    }
    clientRow = await OIDCClientService.getByClientId(clientId);
    if (!clientRow || !clientRow.enabled) {
      return jsonError("invalid_client", "Unknown or disabled client");
    }
    if (!redirectUri || !clientRow.redirectUris.includes(redirectUri)) {
      return jsonError("invalid_request", "redirect_uri does not match");
    }
    // redirect_uri が確定したら、以降のエラーは RP にリダイレクト可
    if (
      !OIDC_SUPPORTED_RESPONSE_TYPES.includes(
        responseType as (typeof OIDC_SUPPORTED_RESPONSE_TYPES)[number],
      )
    ) {
      return oidcErrorRedirect(
        redirectUri,
        "unsupported_response_type",
        "Only 'code' is supported",
        state ?? undefined,
      );
    }
    if (!codeChallenge) {
      return oidcErrorRedirect(
        redirectUri,
        "invalid_request",
        "code_challenge is required (PKCE)",
        state ?? undefined,
      );
    }
    if (
      !OIDC_SUPPORTED_CODE_CHALLENGE_METHODS.includes(
        codeChallengeMethod as (typeof OIDC_SUPPORTED_CODE_CHALLENGE_METHODS)[number],
      )
    ) {
      return oidcErrorRedirect(
        redirectUri,
        "invalid_request",
        "code_challenge_method must be S256",
        state ?? undefined,
      );
    }
    const scopeSet = new Set(scope.split(/\s+/).filter(Boolean));
    if (!scopeSet.has("openid")) {
      return oidcErrorRedirect(
        redirectUri,
        "invalid_scope",
        "openid scope is required",
        state ?? undefined,
      );
    }
    // 未許可 scope 検査
    for (const s of scopeSet) {
      if (!clientRow.allowedScopes.includes(s)) {
        return oidcErrorRedirect(
          redirectUri,
          "invalid_scope",
          `scope "${s}" is not allowed for this client`,
          state ?? undefined,
        );
      }
    }
  }

  if (!clientRow) {
    return jsonError("invalid_client", "Client not found");
  }

  // 署名鍵プレフライト: 鍵未設定なら token endpoint 到達前に失敗させる。
  // これが無いと RP のコールバックで token 500 になり切り分けが困難になる。
  const keyStatus = await getSigningKeyStatus();
  if (!keyStatus.ok) {
    console.error(
      `[OIDC] authorize aborted: signing keys unusable (${keyStatus.reason}): ${keyStatus.message}`,
    );
    await AuditService.log({
      action: "OIDC_AUTHORIZE_SERVER_ERROR",
      category: "OIDC",
      targetId: clientRow.id,
      targetType: "OIDCClient",
      details: { reason: keyStatus.reason, message: keyStatus.message },
      ipAddress: ip,
    });
    return oidcErrorRedirect(
      redirectUri,
      "server_error",
      "OIDC signing keys are not configured on the provider",
      state ?? undefined,
    );
  }

  // セッション確認
  const session = await auth();
  if (!session) {
    // まだ AuthRequest を永続化していなければここで作成
    let handle: string;
    if (authRequestClient) {
      handle = authRequestClient.id;
    } else {
      const saved = await OIDCConsentService.createAuthRequest({
        clientId: clientRow.id,
        redirectUri,
        scope,
        state: state ?? undefined,
        nonce: nonce ?? undefined,
        codeChallenge,
        codeChallengeMethod,
        responseType,
      });
      handle = saved.id;
    }
    const cookie = await buildAuthRequestCookie(handle);
    const callbackUrl = `/api/oidc/authorize?resume=${encodeURIComponent(handle)}`;
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl.toString(), {
      status: 302,
      headers: { "Set-Cookie": cookie },
    });
  }

  // 許可ロールチェック
  if (
    !(clientRow.allowedRoles as string[]).includes(session.user.role)
  ) {
    await AuditService.log({
      action: "OIDC_AUTHORIZE_DENIED",
      category: "OIDC",
      userId: session.user.id,
      targetId: clientRow.id,
      targetType: "OIDCClient",
      details: { reason: "role_not_allowed", role: session.user.role },
      ipAddress: ip,
    });
    return oidcErrorRedirect(
      redirectUri,
      "access_denied",
      "User role is not permitted for this client",
      state ?? undefined,
    );
  }

  // MFA 使用状態（ID Token のクレーム用）
  // パスキー（WebAuthn）認証は所持＋生体/PIN で MFA 相当
  const mfaUsed = session.user.authMethod === "webauthn";

  // 同意チェック（既存同意 or autoApprove）
  const existingConsent = await OIDCConsentService.getExistingConsent(
    clientRow.id,
    session.user.id,
  );

  const sufficientConsent =
    existingConsent !== null &&
    OIDCConsentService.hasSufficientConsent(existingConsent.scope, scope);

  if (clientRow.autoApprove || sufficientConsent) {
    // AuthRequest がまだ無ければここでは作成不要（直接 code 発行）
    await OIDCConsentService.upsertConsent({
      clientId: clientRow.id,
      userId: session.user.id,
      scope,
      autoApproved: clientRow.autoApprove,
    });

    await AuditService.log({
      action: "OIDC_CONSENT_GRANT",
      category: "OIDC",
      userId: session.user.id,
      targetId: clientRow.id,
      targetType: "OIDCClient",
      details: {
        scope,
        auto: clientRow.autoApprove,
        existing: sufficientConsent,
      },
      ipAddress: ip,
    });

    const authCode = await OIDCConsentService.issueAuthCode({
      clientId: clientRow.id,
      userId: session.user.id,
      redirectUri,
      scope,
      nonce,
      codeChallenge,
      codeChallengeMethod,
      mfaUsed,
    });

    await AuditService.log({
      action: "OIDC_AUTHORIZE",
      category: "OIDC",
      userId: session.user.id,
      targetId: clientRow.id,
      targetType: "OIDCClient",
      details: { clientId: clientRow.clientId, scope, auto: true },
      ipAddress: ip,
    });

    // 既存の AuthRequest があれば削除
    if (authRequestClient) {
      await OIDCConsentService.deleteAuthRequest(authRequestClient.id);
    }

    const redirect = new URL(redirectUri);
    redirect.searchParams.set("code", authCode.id);
    if (state) redirect.searchParams.set("state", state);
    // cookie をクリア
    const clearCookie = `${OIDC_AUTH_REQUEST_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
    return NextResponse.redirect(redirect.toString(), {
      status: 302,
      headers: { "Set-Cookie": clearCookie },
    });
  }

  // consent 画面へ: AuthRequest を作成（既に有ればそれを使う）
  let handle: string;
  if (authRequestClient) {
    handle = authRequestClient.id;
  } else {
    const saved = await OIDCConsentService.createAuthRequest({
      clientId: clientRow.id,
      redirectUri,
      scope,
      state: state ?? undefined,
      nonce: nonce ?? undefined,
      codeChallenge,
      codeChallengeMethod,
      responseType,
    });
    handle = saved.id;
  }
  const cookie = await buildAuthRequestCookie(handle);
  const consentUrl = new URL("/oidc/consent", url.origin);
  return NextResponse.redirect(consentUrl.toString(), {
    status: 302,
    headers: { "Set-Cookie": cookie },
  });
}
