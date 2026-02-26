import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ai/tutorial-documents
 * 有効なチュートリアルドキュメント一覧（認証ユーザー向け、extractedText除外）
 */
export async function GET() {
  try {
    await requireAuth();

    const documents = await prisma.tutorialDocument.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        titleJa: true,
        description: true,
        descriptionJa: true,
        fileName: true,
        fileSize: true,
        pageCount: true,
        estimatedTokens: true,
        suggestedPrompts: true,
      },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error fetching tutorial documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutorial documents" },
      { status: 500 },
    );
  }
}
