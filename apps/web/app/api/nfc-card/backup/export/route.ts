import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NfcCardBackupService } from "@/lib/addon-modules/nfc-card/backup/nfc-card-backup-service";
import { AuditService } from "@/lib/services/audit-service";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { json } = await NfcCardBackupService.exportBackup();

    await AuditService.log({
      action: "NFC_CARD_BACKUP_CREATE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      details: { module: "nfc-card" },
    });

    const date = new Date().toISOString().split("T")[0];

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nfc-card-backup-${date}.json"; filename*=UTF-8''nfc-card-backup-${date}.json`,
      },
    });
  } catch (error) {
    console.error("[NFC Card Backup Export] Error:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 },
    );
  }
}
