import { NextResponse } from "next/server";
import { verifyKioskSession } from "@/lib/kiosk/verify-session";
import { getAttendanceList } from "@/lib/kiosk-modules/event-attendance/event-attendance-service";

/**
 * GET /api/kiosk/events/[token] — イベント情報+出席数
 *
 * キオスクCookieで認証。
 */
export async function GET(
  _request: Request,
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

    const attendances = await getAttendanceList(session.id);

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        moduleId: session.moduleId,
        expiresAt: session.expiresAt,
        config: session.config,
      },
      attendanceCount: attendances.length,
      recentAttendances: attendances.slice(0, 5).map((a) => ({
        employeeName: a.employee.name,
        department: a.employee.department.name,
        checkedInAt: a.checkedInAt,
        checkedInVia: a.checkedInVia,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
