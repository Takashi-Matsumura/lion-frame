import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/prisma";

// Warn if AUTH_SECRET is weak or missing
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (
  process.env.NODE_ENV === "production" &&
  (!authSecret || authSecret.length < 32)
) {
  console.error(
    "[SECURITY] AUTH_SECRET is missing or too short (< 32 chars). " +
      "Generate a strong secret with: openssl rand -base64 32",
  );
}

// Lightweight auth config for middleware (Edge Runtime compatible).
// 認証方式は Credentials（email+password）と WebAuthn（passkey）のみ。
// Credentials+JWT 戦略のみのため PrismaAdapter は不要。
export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [],
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8時間
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // サインイン時にビルドIDと認証方法を記録
      if (user) {
        token.buildId = process.env.NEXT_BUILD_ID || "dev";
        if (account?.provider) {
          token.authMethod = account.provider;
        }
      }
      // 初回ログイン時またはセッション更新時にDBからユーザ情報を取得
      if (user || trigger === "update" || !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email ?? "" },
          select: {
            id: true,
            role: true,
            language: true,
            forcePasswordChange: true,
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.language = dbUser.language;
          token.mustChangePassword = dbUser.forcePasswordChange;
        } else if (user) {
          // フォールバック: DBにない場合はuserオブジェクトから取得
          token.id = user.id;
          token.role = (user as { role: Role }).role;
          token.mustChangePassword = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.language = (token.language as string) || "en";
        session.user.mustChangePassword =
          (token.mustChangePassword as boolean) || false;
        session.user.authMethod = token.authMethod as string | undefined;
      }
      // Expose buildId for middleware validation
      (session as unknown as Record<string, unknown>).buildId = token.buildId;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
