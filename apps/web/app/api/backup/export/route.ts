import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BackupService } from "@/lib/addon-modules/backup/backup-service";
import { AuditService } from "@/lib/services/audit-service";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { json, sizeBytes } = await BackupService.createBackup(
      session.user.id!,
      session.user.email!,
      session.user.name || "",
    );

    // 監査ログ
    await AuditService.log({
      action: "BACKUP_CREATE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      details: { sizeBytes },
    });

    const date = new Date()
      .toISOString()
      .split("T")[0];

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="lionframe-backup-${date}.json"; filename*=UTF-8''lionframe-backup-${date}.json`,
      },
    });
  } catch (error) {
    console.error("[Backup Export] Error:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 },
    );
  }
}
