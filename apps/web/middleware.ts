import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { sanitizeCallbackUrl } from "@/lib/services/safe-redirect";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // /kiosk/ パスは独立アプリ — 認証チェックをスキップ
  // ルートグループ分離により、キオスクは独自レイアウトで動作する
  if (pathname.startsWith("/kiosk/") || pathname === "/kiosk") {
    return NextResponse.next();
  }

  // /watasu/ 送信者UIおよび公開APIは認証不要
  if (
    (pathname.startsWith("/watasu/") && !pathname.startsWith("/watasu/api/")) ||
    pathname === "/api/watasu/join" ||
    pathname.startsWith("/api/watasu/upload") ||
    pathname.startsWith("/api/watasu/thumbnail/")
  ) {
    return NextResponse.next();
  }

  const session = req.auth;

  // Reverse proxy support: construct correct redirect base URL
  // Validate x-forwarded-host against AUTH_URL to prevent host header injection
  const authUrl = process.env.AUTH_URL;
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  let baseUrl = req.nextUrl.origin;
  if (forwardedProto && forwardedHost && authUrl) {
    const trustedHost = new URL(authUrl).host;
    if (forwardedHost === trustedHost) {
      baseUrl = `${forwardedProto}://${forwardedHost}`;
    }
  }
  const redirectUrl = (path: string) => new URL(path, baseUrl);

  // Build ID mismatch helper
  const hasBuildIdMismatch = (s: typeof session): boolean => {
    if (!s) return false;
    const currentBuildId = process.env.NEXT_BUILD_ID;
    const tokenBuildId = (s as unknown as Record<string, unknown>).buildId as
      | string
      | undefined;
    return !!(
      currentBuildId &&
      currentBuildId !== "dev" &&
      tokenBuildId &&
      tokenBuildId !== currentBuildId
    );
  };

  // Public routes
  const publicRoutes = ["/", "/login"];
  if (publicRoutes.includes(pathname)) {
    // Redirect authenticated users away from login page
    if (pathname === "/login" && session) {
      // If build ID doesn't match, clear session cookies and stay on /login
      if (hasBuildIdMismatch(session)) {
        const response = NextResponse.redirect(redirectUrl("/login?reason=system-update"));
        response.cookies.delete("authjs.session-token");
        response.cookies.delete("__Secure-authjs.session-token");
        return response;
      }
      // Check if password change is required
      if (session.user.mustChangePassword) {
        return NextResponse.redirect(
          redirectUrl("/settings?passwordReset=true"),
        );
      }
      // callbackUrl 優先（OIDC authorize 経由などで指定されたリダイレクト先）
      const callbackUrl = sanitizeCallbackUrl(
        req.nextUrl.searchParams.get("callbackUrl"),
        "",
      );
      if (callbackUrl) {
        return NextResponse.redirect(redirectUrl(callbackUrl));
      }
      // GUEST users go to welcome page instead of dashboard
      if (session.user.role === "GUEST") {
        return NextResponse.redirect(redirectUrl("/welcome"));
      }
      return NextResponse.redirect(redirectUrl("/dashboard"));
    }
    return NextResponse.next();
  }

  // Build ID validation: invalidate sessions from previous deployments
  if (session && hasBuildIdMismatch(session)) {
    const response = NextResponse.redirect(redirectUrl("/login?reason=system-update"));
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("__Secure-authjs.session-token");
    return response;
  }

  // Protected routes - require authentication
  if (!session) {
    return NextResponse.redirect(redirectUrl("/login"));
  }

  // Check if password change is required for protected routes
  // Allow access to /settings for password change
  if (session.user.mustChangePassword && !pathname.startsWith("/settings")) {
    return NextResponse.redirect(redirectUrl("/settings?passwordReset=true"));
  }

  // GUEST users: redirect to /welcome except for allowed paths
  if (session.user.role === "GUEST") {
    const guestAllowedPaths = ["/welcome", "/guest-profile", "/ai-playground", "/handson"];
    const isAllowed = guestAllowedPaths.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(redirectUrl("/welcome"));
    }
  }

  // Admin-only routes
  // 注意: アクセスキーによる権限委譲があるため、ミドルウェアでは厳密なロールチェックを行わない
  // 各ページで checkAccess を使用して詳細なアクセス制御を行う
  // ここでは /admin のトップページのみ ADMIN 専用として制限
  if (pathname === "/admin") {
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(redirectUrl("/dashboard"));
    }
  }

  // Executive routes - accessible by EXECUTIVE and ADMIN only
  if (pathname.startsWith("/executive")) {
    if (session.user.role !== "EXECUTIVE" && session.user.role !== "ADMIN") {
      return NextResponse.redirect(redirectUrl("/dashboard"));
    }
  }

  // Manager routes
  // Exception: /manager/organization-chart is accessible by USER, MANAGER, EXECUTIVE, and ADMIN
  if (pathname.startsWith("/manager")) {
    if (pathname === "/manager/organization-chart") {
      // Allow USER, MANAGER, EXECUTIVE, and ADMIN
      if (
        session.user.role !== "USER" &&
        session.user.role !== "MANAGER" &&
        session.user.role !== "EXECUTIVE" &&
        session.user.role !== "ADMIN"
      ) {
        return NextResponse.redirect(redirectUrl("/dashboard"));
      }
    } else {
      // Other /manager routes require MANAGER, EXECUTIVE, or ADMIN
      if (
        session.user.role !== "MANAGER" &&
        session.user.role !== "EXECUTIVE" &&
        session.user.role !== "ADMIN"
      ) {
        return NextResponse.redirect(redirectUrl("/dashboard"));
      }
    }
  }

  // Back Office routes - accessible by USER, MANAGER, EXECUTIVE, and ADMIN
  if (pathname.startsWith("/backoffice")) {
    if (
      session.user.role !== "USER" &&
      session.user.role !== "MANAGER" &&
      session.user.role !== "EXECUTIVE" &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.redirect(redirectUrl("/dashboard"));
    }
  }

  // Developer routes - accessible only by ADMIN (layout.tsx additionally gates by NODE_ENV)
  if (pathname.startsWith("/nfc-registration")) {
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(redirectUrl("/dashboard"));
    }
  }

  // Fire-and-forget: ページアクセスログ（レスポンスをブロックしない）
  // 静的ファイル・認証ページ・設定ページは除外
  const excludedLogPaths = ["/login", "/auth/", "/settings", "/_next/", "/api/"];
  const shouldLog = !excludedLogPaths.some((p) => pathname.startsWith(p));
  if (shouldLog && session.user?.id) {
    const logUrl = new URL("/api/usage-log", req.nextUrl.origin);
    fetch(logUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }

  return NextResponse.next();
});

export const config = {
  // uploads はrewriteで/api/uploads/にマッピングされるため、middlewareから除外
  // photos は社員顔写真の静的ファイルのため除外
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads|photos).*)"],
};
