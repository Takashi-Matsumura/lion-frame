import { NextResponse } from "next/server";
import { ApiError, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/page-guide?path=/dashboard&language=ja
 * キャッシュ済みページガイドを取得
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
    });

    if (!guide) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      content: guide.content,
      version: guide.version,
      editedBy: guide.editedBy,
      editedByName: guide.editedByName,
      generatedAt: guide.generatedAt,
      updatedAt: guide.updatedAt,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch page guide" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/page-guide
 * ユーザー編集を保存（USER以上）
 */
export async function PUT(request: Request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { path, language = "ja", content } = body;

    if (!path || !content) {
      return NextResponse.json(
        { error: "path and content are required" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const userName = session.user.name || "Unknown";

    // 既存ガイドを取得
    const existing = await prisma.pageGuide.findUnique({
      where: { path_language: { path, language } },
    });

    if (!existing) {
      // 新規作成（初回編集）
      const guide = await prisma.pageGuide.create({
        data: {
          path,
          language,
          content,
          version: 1,
          editedBy: userId,
          editedByName: userName,
        },
      });

      await AuditService.log({
        action: "PAGE_GUIDE_EDIT",
        category: "MODULE",
        userId,
        targetId: guide.id,
        targetType: "PageGuide",
        details: { path, language, version: 1, action: "create" },
      });

      return NextResponse.json({
        content: guide.content,
        version: guide.version,
        editedBy: guide.editedBy,
        editedByName: guide.editedByName,
        updatedAt: guide.updatedAt,
      });
    }

    // 現在のcontentをリビジョンに退避
    await prisma.pageGuideRevision.create({
      data: {
        guideId: existing.id,
        content: existing.content,
        version: existing.version,
        editedBy: existing.editedBy,
        editedByName: existing.editedByName,
      },
    });

    const newVersion = existing.version + 1;

    // ガイドを更新
    const updated = await prisma.pageGuide.update({
      where: { id: existing.id },
      data: {
        content,
        version: newVersion,
        editedBy: userId,
        editedByName: userName,
      },
    });

    await AuditService.log({
      action: "PAGE_GUIDE_EDIT",
      category: "MODULE",
      userId,
      targetId: updated.id,
      targetType: "PageGuide",
      details: { path, language, version: newVersion, action: "edit" },
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
      { error: "Failed to save page guide" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/page-guide?path=/dashboard&language=ja
 * キャッシュ済みページガイドを削除（管理者のみ、または再生成用）
 */
export async function DELETE(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const language = searchParams.get("language") || "ja";

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    await prisma.pageGuide.deleteMany({
      where: { path, language },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    return NextResponse.json(
      { error: "Failed to delete page guide" },
      { status: 500 },
    );
  }
}
