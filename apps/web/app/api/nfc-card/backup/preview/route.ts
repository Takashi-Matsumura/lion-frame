import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NfcCardBackupService } from "@/lib/addon-modules/nfc-card/backup/nfc-card-backup-service";

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

    const preview = await NfcCardBackupService.previewRestore(body);
    return NextResponse.json({ preview });
  } catch (error) {
    console.error("[NFC Card Backup Preview] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 },
    );
  }
}
