import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ai/tutorial-documents/{id}
 * チュートリアルドキュメント詳細（extractedText + fileUrl含む）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;

    const document = await prisma.tutorialDocument.findFirst({
      where: { id, isEnabled: true },
      select: {
        id: true,
        title: true,
        titleJa: true,
        extractedText: true,
        fileUrl: true,
        pageCount: true,
        estimatedTokens: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error fetching tutorial document:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutorial document" },
      { status: 500 },
    );
  }
}
