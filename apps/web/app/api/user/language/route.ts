import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { LANGUAGE_COOKIE_NAME } from "@/lib/i18n/get-language";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();

    const { language } = await request.json();

    if (!language || !["en", "ja"].includes(language)) {
      throw ApiError.badRequest(
        "Invalid language. Must be 'en' or 'ja'",
      );
    }

    if (!session.user.email) {
      throw ApiError.badRequest("User email not found in session");
    }

    // まずユーザが存在するか確認
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw ApiError.notFound(
        "User not found in database",
        "ユーザーが見つかりません",
      );
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: { language },
    });

    // レスポンスにCookieを設定（ログアウト後も言語設定を維持）
    const response = NextResponse.json({ success: true, language });
    response.cookies.set(LANGUAGE_COOKIE_NAME, language, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1年間
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error updating language preference:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
