// OIDC の期限切れレコードを削除する。
// cron で定期実行、管理者は /api/admin/oidc/cleanup で手動実行できる。

import cron from "node-cron";
import { prisma } from "@/lib/prisma";

export interface OidcCleanupResult {
  authRequests: number;
  authCodes: number;
  accessTokens: number;
}

export async function cleanupExpiredOidc(): Promise<OidcCleanupResult> {
  const now = new Date();
  const [authRequests, authCodes, accessTokens] = await prisma.$transaction([
    prisma.oIDCAuthRequest.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
    prisma.oIDCAuthCode.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
    prisma.oIDCAccessToken.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
  ]);

  return {
    authRequests: authRequests.count,
    authCodes: authCodes.count,
    accessTokens: accessTokens.count,
  };
}

let task: cron.ScheduledTask | null = null;

/**
 * 1 時間毎に期限切れ OIDC レコードを削除する cron を開始。
 */
export function startOidcCleanupCron(): void {
  if (task) return;
  task = cron.schedule(
    "0 * * * *",
    async () => {
      try {
        const result = await cleanupExpiredOidc();
        const total =
          result.authRequests + result.authCodes + result.accessTokens;
        if (total > 0) {
          console.log("[OIDC] cleanup:", result);
        }
      } catch (error) {
        console.error("[OIDC] cleanup failed:", error);
      }
    },
    { timezone: "UTC" },
  );
  console.log("[OIDC] cleanup cron scheduled (hourly).");
}

export function stopOidcCleanupCron(): void {
  if (task) {
    task.stop();
    task = null;
  }
}
