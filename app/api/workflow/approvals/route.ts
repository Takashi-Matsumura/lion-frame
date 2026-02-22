import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyPendingApprovals } from "@/lib/services/workflow-service";

/**
 * 承認待ち一覧取得
 * GET /api/workflow/approvals
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
  if (!allowedRoles.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const approvals = await getMyPendingApprovals(session.user.id);
    return NextResponse.json(approvals);
  } catch (error) {
    console.error("Failed to get approvals:", error);
    return NextResponse.json(
      { error: "Failed to get approvals" },
      { status: 500 },
    );
  }
}
