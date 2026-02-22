import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  cancelRequest,
  getRequestDetail,
} from "@/lib/services/workflow-service";

/**
 * 申請詳細取得
 * GET /api/workflow/requests/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const detail = await getRequestDetail(id, session.user.id);
    if (!detail) {
      return NextResponse.json(
        { error: "Not found or not authorized" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error("Failed to get request detail:", error);
    return NextResponse.json(
      { error: "Failed to get request detail" },
      { status: 500 },
    );
  }
}

/**
 * 申請取消
 * DELETE /api/workflow/requests/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await cancelRequest(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel request:", error);
    const message =
      error instanceof Error ? error.message : "Failed to cancel request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
