import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limiter";

// Full auth config (for API routes - Node.js runtime)
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    // DB直接認証（メール+パスワード）
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Rate limit: 10 attempts per 15 minutes per IP
        const ip = getClientIp(request);
        const rateLimit = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
        if (!rateLimit.allowed) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user?.password) {
            // ログイン失敗を監査ログに記録
            await AuditService.log({
              action: "LOGIN_FAILURE",
              category: "AUTH",
              details: {
                email: credentials.email,
                provider: "credentials",
                reason: "User not found or no password set",
              },
            }).catch(() => {});
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password,
          );

          if (!isValid) {
            await AuditService.log({
              action: "LOGIN_FAILURE",
              category: "AUTH",
              details: {
                email: credentials.email,
                provider: "credentials",
                reason: "Invalid password",
              },
            }).catch(() => {});
            return null;
          }

          // 最終サインイン日時を更新
          await prisma.user.update({
            where: { id: user.id },
            data: { lastSignInAt: new Date() },
          });

          // ログイン通知を発行
          await NotificationService.securityNotify(user.id, {
            title: "New login detected",
            titleJa: "新しいログインを検出しました",
            message: "You have successfully logged in.",
            messageJa: "ログインしました。",
          }).catch((err) => {
            console.error("[Auth] Failed to create login notification:", err);
          });

          // ログイン成功を監査ログに記録
          await AuditService.log({
            action: "LOGIN_SUCCESS",
            category: "AUTH",
            userId: user.id,
            details: {
              email: credentials.email,
              provider: "credentials",
            },
          }).catch(() => {});

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("[Auth] Credentials authentication error:", error);
          return null;
        }
      },
    }),
  ],
});
