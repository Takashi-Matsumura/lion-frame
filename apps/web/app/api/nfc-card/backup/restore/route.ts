import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NfcCardBackupService } from "@/lib/addon-modules/nfc-card/backup/nfc-card-backup-service";
import { AuditService } from "@/lib/services/audit-service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!NfcCardBackupService.validateBackupFile(body)) {
      return NextResponse.json(
        { error: "Invalid NFC card backup file" },
        { status: 400 },
      );
    }

    const result = await NfcCardBackupService.executeRestore(body);

    await AuditService.log({
      action: "NFC_CARD_BACKUP_RESTORE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      details: { module: "nfc-card", restored: result.restored },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[NFC Card Backup Restore] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to restore";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
