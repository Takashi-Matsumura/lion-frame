import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
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

// Lightweight auth config for middleware (Edge Runtime compatible)
export const authConfig = {
  // Type assertion needed due to version mismatch between @auth/prisma-adapter and next-auth
  adapter: PrismaAdapter(prisma) as NextAuthConfig["adapter"],
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      ...(process.env.NODE_ENV === "development" && {
        authorization: {
          params: {
            prompt: "select_account",
          },
        },
      }),
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8時間
  },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth プロバイダー（Google/GitHub）でのサインイン時
      if (
        (account?.provider === "google" || account?.provider === "github") &&
        user.email
      ) {
        // 既存のユーザを検索
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          // 既存のアカウントリンクをチェック
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          // アカウントリンクが存在しない場合、作成
          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as
                  | string
                  | null
                  | undefined,
              },
            });
          }

          // 最終サインイン日時を更新
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { lastSignInAt: new Date() },
          });

          // ログイン成功を監査ログに記録
          await prisma.auditLog
            .create({
              data: {
                action: "LOGIN_SUCCESS",
                category: "AUTH",
                userId: existingUser.id,
                details: JSON.stringify({
                  provider: account.provider,
                }),
              },
            })
            .catch((err) => {
              console.error("[Auth] Failed to create audit log:", err);
            });
        }
      }

      return true;
    },
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
            twoFactorEnabled: true,
            forcePasswordChange: true,
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.language = dbUser.language;
          token.twoFactorEnabled = dbUser.twoFactorEnabled;

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
        session.user.twoFactorEnabled =
          (token.twoFactorEnabled as boolean) || false;
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
