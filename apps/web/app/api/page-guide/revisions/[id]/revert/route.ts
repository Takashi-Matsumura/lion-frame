import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * POST /api/page-guide/revisions/[id]/revert
 * 指定リビジョンの内容で現在のガイドを上書き
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: revisionId } = await params;

    const revision = await prisma.pageGuideRevision.findUnique({
      where: { id: revisionId },
      include: { guide: true },
    });

    if (!revision) {
      return NextResponse.json(
        { error: "Revision not found" },
        { status: 404 },
      );
    }

    const guide = revision.guide;
    const userId = session.user.id;
    const userName = session.user.name || "Unknown";

    // 現在のcontentをリビジョンに退避
    await prisma.pageGuideRevision.create({
      data: {
        guideId: guide.id,
        content: guide.content,
        version: guide.version,
        editedBy: guide.editedBy,
        editedByName: guide.editedByName,
      },
    });

    const newVersion = guide.version + 1;

    // 指定リビジョンのcontentで更新
    const updated = await prisma.pageGuide.update({
      where: { id: guide.id },
      data: {
        content: revision.content,
        version: newVersion,
        editedBy: userId,
        editedByName: userName,
      },
    });

    await AuditService.log({
      action: "PAGE_GUIDE_REVERT",
      category: "MODULE",
      userId,
      targetId: guide.id,
      targetType: "PageGuide",
      details: {
        path: guide.path,
        language: guide.language,
        revertedToVersion: revision.version,
        newVersion,
      },
    });

    return NextResponse.json({
      content: updated.content,
      version: updated.version,
      editedBy: updated.editedBy,
      editedByName: updated.editedByName,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    return NextResponse.json(
      { error: "Failed to revert page guide" },
      { status: 500 },
    );
  }
}
