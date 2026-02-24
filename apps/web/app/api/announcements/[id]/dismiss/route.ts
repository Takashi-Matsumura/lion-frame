import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/announcements/[id]/dismiss
 * アナウンスの非表示を記録（認証ユーザーのみ）
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.announcementDismissal.upsert({
    where: {
      announcementId_userId: {
        announcementId: id,
        userId: session.user.id,
      },
    },
    update: {},
    create: {
      announcementId: id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
