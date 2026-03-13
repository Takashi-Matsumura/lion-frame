import { NextResponse } from "next/server";
import { signValue } from "@/lib/services/cookie-signer";
import { getSessionByToken } from "@/lib/kiosk/kiosk-session-service";
import { KIOSK_COOKIE_NAME } from "@/lib/kiosk/verify-session";

/**
 * POST /api/kiosk/login — キオスクCookie発行
 *
 * トークンを検証し、署名付きCookieを設定してキオスク画面へのアクセスを許可する。
 * NextAuth認証不要（Public API）。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 },
      );
    }

    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    // 署名Cookie作成
    const signedToken = await signValue(token);
    const response = NextResponse.json({
      success: true,
      session: {
        name: session.name,
        moduleId: session.moduleId,
        expiresAt: session.expiresAt,
      },
    });

    response.cookies.set(KIOSK_COOKIE_NAME, signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: session.expiresAt,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
