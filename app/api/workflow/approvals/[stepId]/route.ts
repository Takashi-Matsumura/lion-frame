import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { processStep } from "@/lib/services/workflow-service";

/**
 * 承認/却下処理
 * POST /api/workflow/approvals/[stepId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stepId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
  if (!allowedRoles.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { stepId } = await params;
    const body = await request.json();
    const { action, comment } = body;

    if (!action || !["APPROVED", "REJECTED"].includes(action)) {
      return NextResponse.json(
        { error: "action must be APPROVED or REJECTED" },
        { status: 400 },
      );
    }

    await processStep(stepId, session.user.id, action, comment);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to process step:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process step";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
