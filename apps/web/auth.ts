import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limiter";
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

          // 仮パスワードの有効期限チェック
          if (
            user.forcePasswordChange &&
            user.passwordExpiresAt &&
            new Date() > new Date(user.passwordExpiresAt)
          ) {
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
        const ip = getClientIp(request);
        const rateLimit = checkRateLimit(`webauthn:${ip}`, 20, 15 * 60 * 1000);
        if (!rateLimit.allowed) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const raw = creds?.assertion;
        if (typeof raw !== "string" || raw.length === 0) {
          return null;
        }

        let assertion: AuthenticationResponseJSON;
        try {
          assertion = JSON.parse(raw) as AuthenticationResponseJSON;
        } catch {
          return null;
        }

        const ctx = await getChallenge();
        if (!ctx || ctx.kind !== "authentication") {
          await clearChallenge();
          return null;
        }

        const stored = await CredentialService.findByCredentialId(
          assertion.id,
        );
        if (!stored) {
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
          await clearChallenge();
          return null;
        }

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
