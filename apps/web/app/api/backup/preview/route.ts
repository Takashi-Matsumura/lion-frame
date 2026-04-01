import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BackupService } from "@/lib/addon-modules/backup/backup-service";
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

    const language =
      (request.headers.get("Accept-Language")?.startsWith("ja") ? "ja" : "en") as
        | "en"
        | "ja";
    const preview = await BackupService.previewRestore(backup, language);

    return NextResponse.json({ preview });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to preview restore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
