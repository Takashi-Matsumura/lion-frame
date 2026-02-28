import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/page-guide/revisions?path=/dashboard&language=ja
 * リビジョン一覧（version降順、直近10件）
 */
export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const language = searchParams.get("language") || "ja";

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const guide = await prisma.pageGuide.findUnique({
      where: { path_language: { path, language } },
      select: { id: true },
    });

    if (!guide) {
      return NextResponse.json({ revisions: [] });
    }

    const revisions = await prisma.pageGuideRevision.findMany({
      where: { guideId: guide.id },
      orderBy: { version: "desc" },
      take: 10,
      select: {
        id: true,
        content: true,
        version: true,
        editedBy: true,
        editedByName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ revisions });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch revisions" },
      { status: 500 },
    );
  }
}
