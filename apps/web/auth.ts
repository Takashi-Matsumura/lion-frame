import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import {
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
  resetRateLimit,
} from "@/lib/services/rate-limiter";
import {
  clearChallenge,
  getChallenge,
} from "@/lib/webauthn/challenge-cookie";
import { CredentialService } from "@/lib/webauthn/credential-service";
import { verifyAuthentication } from "@/lib/webauthn/verify";

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

        // Rate limit: 失敗 10 回 / 15 分 / IP（成功はカウントしない・Issue #58）
        const ip = getClientIp(request);
        const rateLimitKey = `login:${ip}`;
        if (!isRateLimited(rateLimitKey, 10, 15 * 60 * 1000).allowed) {
          // レート超過も監査ログに残す（原因追跡のため）
          await AuditService.log({
            action: "LOGIN_FAILURE",
            category: "AUTH",
            details: {
              email: credentials.email,
              provider: "credentials",
              reason: "Rate limit exceeded",
            },
          }).catch(() => {});
          throw new Error("Too many login attempts. Please try again later.");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user?.password) {
            recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
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
            recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
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

          // 仮パスワードの有効期限チェック
          if (
            user.forcePasswordChange &&
            user.passwordExpiresAt &&
            new Date() > new Date(user.passwordExpiresAt)
          ) {
            recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
            await AuditService.log({
              action: "LOGIN_FAILURE",
              category: "AUTH",
              details: {
                email: credentials.email,
                provider: "credentials",
                reason: "Temporary password expired",
              },
            }).catch(() => {});
            return null;
          }

          // 認証成功: レート制限カウントをリセット
          resetRateLimit(rateLimitKey);

          // 最終サインイン日時を更新
          await prisma.user.update({
            where: { id: user.id },
            data: { lastSignInAt: new Date() },
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
    // WebAuthn / Passkey 認証
    Credentials({
      id: "webauthn",
      name: "Passkey",
      credentials: {
        assertion: { label: "Assertion", type: "text" },
      },
      async authorize(creds, request) {
        // Rate limit: 失敗 20 回 / 15 分 / IP（成功はカウントしない・Issue #58）
        const ip = getClientIp(request);
        const rateLimitKey = `webauthn:${ip}`;
        const WINDOW_MS = 15 * 60 * 1000;
        if (!isRateLimited(rateLimitKey, 20, WINDOW_MS).allowed) {
          await AuditService.log({
            action: "WEBAUTHN_AUTHENTICATE_FAILURE",
            category: "AUTH",
            details: { reason: "Rate limit exceeded" },
          }).catch(() => {});
          throw new Error("Too many login attempts. Please try again later.");
        }

        const raw = creds?.assertion;
        if (typeof raw !== "string" || raw.length === 0) {
          recordFailedAttempt(rateLimitKey, WINDOW_MS);
          return null;
        }

        let assertion: AuthenticationResponseJSON;
        try {
          assertion = JSON.parse(raw) as AuthenticationResponseJSON;
        } catch {
          recordFailedAttempt(rateLimitKey, WINDOW_MS);
          return null;
        }

        const ctx = await getChallenge();
        if (!ctx || ctx.kind !== "authentication") {
          recordFailedAttempt(rateLimitKey, WINDOW_MS);
          await clearChallenge();
          return null;
        }

        const stored = await CredentialService.findByCredentialId(
          assertion.id,
        );
        if (!stored) {
          recordFailedAttempt(rateLimitKey, WINDOW_MS);
          await clearChallenge();
          await AuditService.log({
            action: "WEBAUTHN_AUTHENTICATE_FAILURE",
            category: "AUTH",
            details: {
              credentialId: assertion.id,
              reason: "credential not registered",
            },
          }).catch(() => {});
          return null;
        }

        try {
          const { newCounter } = await verifyAuthentication(
            assertion,
            ctx.challenge,
            {
              credentialId: stored.credentialId,
              publicKey: new Uint8Array(stored.publicKey),
              counter: stored.counter,
              transports: stored.transports,
            },
          );
          await CredentialService.updateCounter(stored.id, newCounter);
        } catch (error) {
          recordFailedAttempt(rateLimitKey, WINDOW_MS);
          await clearChallenge();
          await AuditService.log({
            action: "WEBAUTHN_AUTHENTICATE_FAILURE",
            category: "AUTH",
            userId: stored.userId,
            details: {
              credentialId: stored.credentialId,
              reason:
                error instanceof Error ? error.message : "verification failed",
            },
          }).catch(() => {});
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { id: stored.userId },
        });
        if (!user) {
          recordFailedAttempt(rateLimitKey, WINDOW_MS);
          await clearChallenge();
          return null;
        }

        // 認証成功: レート制限カウントをリセット
        resetRateLimit(rateLimitKey);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastSignInAt: new Date() },
        });

        await AuditService.log({
          action: "WEBAUTHN_AUTHENTICATE",
          category: "AUTH",
          userId: user.id,
          targetId: stored.id,
          targetType: "WebAuthnCredential",
        }).catch(() => {});

        await clearChallenge();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
