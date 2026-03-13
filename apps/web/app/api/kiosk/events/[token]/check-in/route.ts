import { NextResponse } from "next/server";
import { verifyKioskSession } from "@/lib/kiosk/verify-session";
import {
  checkInByNfc,
  checkInManual,
} from "@/lib/kiosk-modules/event-attendance/event-attendance-service";

/**
 * POST /api/kiosk/events/[token]/check-in — チェックイン
 *
 * キオスクCookieで認証。
 * Body: { nfcCardId: string } (NFC) or { employeeId: string } (手動)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await verifyKioskSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { token } = await params;
    if (session.token !== token) {
      return NextResponse.json(
        { error: "Token mismatch" },
        { status: 403 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    const nfcCardId = typeof body.nfcCardId === "string" ? body.nfcCardId : undefined;
    const employeeId = typeof body.employeeId === "string" ? body.employeeId : undefined;

    if (!nfcCardId && !employeeId) {
      return NextResponse.json(
        { error: "nfcCardId or employeeId is required" },
        { status: 400 },
      );
    }

    const result = nfcCardId
      ? await checkInByNfc(session.id, nfcCardId)
      : await checkInManual(session.id, employeeId!);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
