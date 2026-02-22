import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getMyRequests,
  submitRequest,
} from "@/lib/services/workflow-service";

/**
 * 自分の申請一覧取得
 * GET /api/workflow/requests
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requests = await getMyRequests(session.user.id);
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to get requests:", error);
    return NextResponse.json(
      { error: "Failed to get requests" },
      { status: 500 },
    );
  }
}

/**
 * 新規申請提出
 * POST /api/workflow/requests
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { templateId, title, formData } = body;

    if (!templateId || !title || !formData) {
      return NextResponse.json(
        { error: "templateId, title, and formData are required" },
        { status: 400 },
      );
    }

    const result = await submitRequest(
      templateId,
      session.user.id,
      title,
      formData,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to submit request:", error);
    const message =
      error instanceof Error ? error.message : "Failed to submit request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
