import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 休暇種別一覧取得
 * GET /api/workflow/leave-types
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leaveTypes = await prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(leaveTypes);
  } catch (error) {
    console.error("Failed to get leave types:", error);
    return NextResponse.json(
      { error: "Failed to get leave types" },
      { status: 500 },
    );
  }
}
