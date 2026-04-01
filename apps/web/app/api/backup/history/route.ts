import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BackupService } from "@/lib/addon-modules/backup/backup-service";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await BackupService.getHistory();
    return NextResponse.json({ history });
  } catch (error) {
    console.error("[Backup History] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch backup history" },
      { status: 500 },
    );
  }
}
