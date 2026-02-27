import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";

type DiagnosticStatus = "pass" | "fail" | "warn";

interface DiagnosticResult {
  id: string;
  name: string;
  nameJa: string;
  status: DiagnosticStatus;
  message: string;
  messageJa: string;
  durationMs: number;
}

async function runDiagnostic(
  id: string,
  name: string,
  nameJa: string,
  fn: () => Promise<{ status: DiagnosticStatus; message: string; messageJa: string }>,
): Promise<DiagnosticResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      id,
      name,
      nameJa,
      status: result.status,
      message: result.message,
      messageJa: result.messageJa,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      id,
      name,
      nameJa,
      status: "fail",
      message: errMsg,
      messageJa: errMsg,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * POST /api/admin/diagnostics
 * Run system diagnostics (ADMIN only)
 *
 * 各診断項目を個別の監査ログエントリとして記録する。
 */
export const POST = apiHandler(async (_request, session) => {
  // 全診断を並列実行（async-parallel: Promise.all で独立した処理を並列化）
  const results = await Promise.all([
    // 1. DB Connection
    runDiagnostic("db_connection", "Database Connection", "データベース接続", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "pass",
        message: "Database connection successful",
        messageJa: "データベース接続に成功しました",
      };
    }),

    // 2. Auth System
    runDiagnostic("auth_system", "Authentication", "認証システム", async () => {
      if (session.user?.email) {
        return {
          status: "pass",
          message: `Authenticated as ${session.user.email}`,
          messageJa: `${session.user.email} として認証済み`,
        };
      }
      return {
        status: "warn",
        message: "Session exists but no email found",
        messageJa: "セッションはありますがメールアドレスがありません",
      };
    }),

    // 3. Audit Log (write → read → delete)
    runDiagnostic("audit_log", "Audit Log", "監査ログ", async () => {
      const testLog = await prisma.auditLog.create({
        data: {
          action: "SYSTEM_DIAGNOSTIC",
          category: "SYSTEM_SETTING",
          userId: session.user.id,
          details: JSON.stringify({ test: true }),
        },
      });

      const found = await prisma.auditLog.findUnique({
        where: { id: testLog.id },
      });

      if (!found) {
        return {
          status: "fail",
          message: "Failed to read test audit log",
          messageJa: "テスト監査ログの読み取りに失敗しました",
        };
      }

      await prisma.auditLog.delete({
        where: { id: testLog.id },
      });

      return {
        status: "pass",
        message: "Audit log write/read/delete successful",
        messageJa: "監査ログの書込/読取/削除に成功しました",
      };
    }),

    // 4. Notification (create → read → delete)
    runDiagnostic("notification", "Notification", "通知", async () => {
      const testNotification = await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "SYSTEM",
          title: "Diagnostic test",
          titleJa: "診断テスト",
          message: "This is a diagnostic test notification",
          messageJa: "診断テスト通知です",
        },
      });

      const found = await prisma.notification.findUnique({
        where: { id: testNotification.id },
      });

      if (!found) {
        return {
          status: "fail",
          message: "Failed to read test notification",
          messageJa: "テスト通知の読み取りに失敗しました",
        };
      }

      await prisma.notification.delete({
        where: { id: testNotification.id },
      });

      return {
        status: "pass",
        message: "Notification write/read/delete successful",
        messageJa: "通知の書込/読取/削除に成功しました",
      };
    }),

    // 5. API Health
    runDiagnostic("api_health", "API Health", "API応答", async () => {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.status === 200) {
        return {
          status: "pass",
          message: "Health endpoint returned 200",
          messageJa: "ヘルスエンドポイントが200を返しました",
        };
      }
      return {
        status: "fail",
        message: `Health endpoint returned ${response.status}`,
        messageJa: `ヘルスエンドポイントが${response.status}を返しました`,
      };
    }),

    // 6. Login Notification Cleanup
    runDiagnostic("login_notification_cleanup", "Login Notification Cleanup", "ログイン通知クリーンアップ", async () => {
      const result = await NotificationService.purgeLoginNotifications();
      if (result.count > 0) {
        return {
          status: "pass",
          message: `Purged ${result.count} login notifications`,
          messageJa: `${result.count}件のログイン通知を削除しました`,
        };
      }
      return {
        status: "pass",
        message: "No login notifications to purge",
        messageJa: "削除対象のログイン通知はありません",
      };
    }),

    // 7. Storage
    runDiagnostic("storage", "Storage", "ストレージ", async () => {
      const uploadsDir = join(process.cwd(), "public", "uploads");
      try {
        await access(uploadsDir, constants.W_OK);
        return {
          status: "pass",
          message: "Uploads directory is writable",
          messageJa: "uploadsディレクトリは書込可能です",
        };
      } catch {
        try {
          await mkdir(uploadsDir, { recursive: true });
          return {
            status: "warn",
            message: "Uploads directory was missing, created successfully",
            messageJa: "uploadsディレクトリが存在しなかったため作成しました",
          };
        } catch {
          return {
            status: "warn",
            message: "Uploads directory is not writable",
            messageJa: "uploadsディレクトリに書込権限がありません",
          };
        }
      }
    }),
  ]);

  // 各診断結果を個別の監査ログエントリとして記録
  for (const result of results) {
    await AuditService.log({
      action: "SYSTEM_DIAGNOSTIC",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      details: {
        diagnosticId: result.id,
        diagnosticName: result.name,
        diagnosticNameJa: result.nameJa,
        status: result.status,
        message: result.message,
        messageJa: result.messageJa,
        durationMs: result.durationMs,
      },
    });
  }

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === "pass").length,
    fail: results.filter((r) => r.status === "fail").length,
    warn: results.filter((r) => r.status === "warn").length,
    totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
  };

  // 失敗がある場合、全ADMIN宛に警告通知をブロードキャスト
  if (summary.fail > 0) {
    const failedNames = results
      .filter((r) => r.status === "fail")
      .map((r) => r.nameJa)
      .join(", ");
    await NotificationService.broadcast({
      role: "ADMIN",
      type: "WARNING",
      priority: "HIGH",
      title: `System Diagnostic: ${summary.fail} check(s) failed`,
      titleJa: `システム診断: ${summary.fail}件のチェックが失敗`,
      message: `Failed checks: ${results.filter((r) => r.status === "fail").map((r) => r.name).join(", ")}`,
      messageJa: `失敗した項目: ${failedNames}`,
      actionUrl: "/dashboard",
      actionLabel: "View Dashboard",
      actionLabelJa: "ダッシュボードを確認",
      source: "SYSTEM_DIAGNOSTIC",
    });
  }

  return {
    results,
    summary,
    timestamp: new Date().toISOString(),
  };
}, { admin: true });
