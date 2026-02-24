import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrgContextEnabled } from "@/lib/core-modules/ai/services/org-context";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/user/org-context
 * ユーザーの組織データ連携設定とシステムレベルの有効/無効を取得
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { orgContextEnabled: true },
    });

    const systemEnabled = await isOrgContextEnabled();

    return NextResponse.json({
      userEnabled: user?.orgContextEnabled ?? true,
      systemEnabled,
    });
  } catch (error) {
    console.error("Failed to get org context setting:", error);
    return NextResponse.json(
      { error: "Failed to get org context setting" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/user/org-context
 * ユーザーの組織データ連携設定を更新
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enabled } = await request.json();

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: { orgContextEnabled: enabled },
    });

    await AuditService.log({
      action: "ORG_CONTEXT_TOGGLE",
      category: "MODULE",
      userId: session.user.id,
      details: { enabled },
    });

    return NextResponse.json({
      success: true,
      enabled,
    });
  } catch (error) {
    console.error("Failed to update org context setting:", error);
    return NextResponse.json(
      { error: "Failed to update org context setting" },
      { status: 500 },
    );
  }
}
