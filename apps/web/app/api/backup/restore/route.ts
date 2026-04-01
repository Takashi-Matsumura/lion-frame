import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BackupService } from "@/lib/addon-modules/backup/backup-service";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";
import type { BackupFile } from "@/lib/addon-modules/backup/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const backup = body as BackupFile;

    if (!backup.manifest || !backup.data) {
      return NextResponse.json(
        { error: "Invalid backup file format" },
        { status: 400 },
      );
    }

    if (backup.manifest.version !== "1.0") {
      return NextResponse.json(
        { error: "Unsupported backup version" },
        { status: 400 },
      );
    }

    const { restoredModels } = await BackupService.executeRestore(
      backup,
      session.user.id!,
    );

    const totalRecords = Object.values(restoredModels).reduce(
      (a, b) => a + b,
      0,
    );

    // 監査ログ
    await AuditService.log({
      action: "BACKUP_RESTORE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      details: {
        backupCreatedAt: backup.manifest.createdAt,
        backupCreatedBy: backup.manifest.createdBy,
        restoredModels,
        totalRecords,
      },
    });

    // ADMIN全員に通知
    await NotificationService.broadcast({
      role: "ADMIN",
      type: "WARNING",
      priority: "HIGH",
      title: "Data Restored",
      titleJa: "データが復元されました",
      message: `${totalRecords} records were restored from a backup created on ${backup.manifest.createdAt}`,
      messageJa: `${backup.manifest.createdAt} に作成されたバックアップ���ら ${totalRecords} 件のレコードが復元されました`,
      source: "backup",
    });

    return NextResponse.json({
      success: true,
      restoredModels,
      totalRecords,
    });
  } catch (error) {
    console.error("[Backup Restore] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to restore backup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
