import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { estimateTokens } from "@/lib/core-modules/ai";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * PATCH /api/admin/tutorial-documents/[id]
 * チュートリアルドキュメントを更新（管理者のみ）
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const contentType = request.headers.get("content-type") || "";

    // FormData（PDF再アップロードあり）かJSON（メタデータのみ）かを判定
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const title = formData.get("title") as string | null;
      const titleJa = formData.get("titleJa") as string | null;
      const description = formData.get("description") as string | null;
      const descriptionJa = formData.get("descriptionJa") as string | null;
      const isEnabled = formData.get("isEnabled") as string | null;
      const sortOrder = formData.get("sortOrder") as string | null;
      const suggestedPromptsRaw = formData.get("suggestedPrompts") as string | null;

      const updateData: Record<string, unknown> = {};

      if (title !== null) updateData.title = title;
      if (titleJa !== null) updateData.titleJa = titleJa || null;
      if (description !== null) updateData.description = description || null;
      if (descriptionJa !== null) updateData.descriptionJa = descriptionJa || null;
      if (isEnabled !== null) updateData.isEnabled = isEnabled === "true";
      if (sortOrder !== null) updateData.sortOrder = parseInt(sortOrder, 10) || 0;
      if (suggestedPromptsRaw !== null) {
        try {
          updateData.suggestedPrompts = JSON.parse(suggestedPromptsRaw);
        } catch {
          // ignore parse error
        }
      }

      // 新しいPDFがアップロードされた場合
      if (file && file.size > 0) {
        if (file.type !== "application/pdf") {
          throw ApiError.badRequest("Only PDF files are allowed", "PDFファイルのみアップロード可能です");
        }

        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
          throw ApiError.badRequest("File too large. Maximum size is 20MB", "ファイルサイズが大きすぎます。最大20MBです");
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // テキスト再抽出
        let extractedText = "";
        let pageCount = 0;
        try {
          const pdf = new PDFParse({ data: new Uint8Array(buffer) });
          const info = await pdf.getInfo();
          const textResult = await pdf.getText();
          extractedText = textResult.text;
          pageCount = info.total;
          await pdf.destroy();
        } catch {
          throw ApiError.badRequest("Failed to parse PDF file", "PDFファイルの解析に失敗しました");
        }

        // 旧ファイル削除
        const existing = await prisma.tutorialDocument.findUnique({ where: { id } });
        if (existing?.fileUrl?.startsWith("/uploads/tutorials/")) {
          try {
            await unlink(join(process.cwd(), "public", existing.fileUrl));
          } catch {
            // ignore
          }
        }

        // 新ファイル保存
        const timestamp = Date.now();
        const cuid = crypto.randomUUID().replace(/-/g, "").slice(0, 25);
        const filename = `${cuid}-${timestamp}.pdf`;
        const baseDir = resolve(process.cwd(), "public", "uploads", "tutorials");
        await mkdir(baseDir, { recursive: true });
        const filepath = resolve(baseDir, filename);

        if (!filepath.startsWith(baseDir)) {
          throw ApiError.badRequest("Invalid filename");
        }

        await writeFile(filepath, buffer);

        updateData.fileUrl = `/uploads/tutorials/${filename}`;
        updateData.fileName = file.name;
        updateData.fileSize = file.size;
        updateData.pageCount = pageCount;
        updateData.extractedText = extractedText;
        updateData.estimatedTokens = estimateTokens(extractedText);
      }

      const document = await prisma.tutorialDocument.update({
        where: { id },
        data: updateData,
      });

      await AuditService.log({
        action: "TUTORIAL_DOCUMENT_UPDATE",
        category: "SYSTEM_SETTING",
        userId: session.user.id,
        targetId: id,
        targetType: "TutorialDocument",
        details: { title: document.title, hasNewFile: !!file },
      }).catch(() => {});

      return NextResponse.json({ success: true, document });
    }

    // JSONリクエスト（メタデータのみ更新）
    const body = await request.json();
    const {
      title,
      titleJa,
      description,
      descriptionJa,
      isEnabled,
      sortOrder,
      suggestedPrompts,
    } = body;

    const document = await prisma.tutorialDocument.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleJa !== undefined && { titleJa: titleJa || null }),
        ...(description !== undefined && { description: description || null }),
        ...(descriptionJa !== undefined && { descriptionJa: descriptionJa || null }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(suggestedPrompts !== undefined && { suggestedPrompts }),
      },
    });

    await AuditService.log({
      action: "TUTORIAL_DOCUMENT_UPDATE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      targetId: id,
      targetType: "TutorialDocument",
      details: { title: document.title },
    }).catch(() => {});

    return NextResponse.json({ success: true, document });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error updating tutorial document:", error);
    return NextResponse.json(
      { error: "Failed to update tutorial document" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/tutorial-documents/[id]
 * チュートリアルドキュメントを削除（管理者のみ）
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const document = await prisma.tutorialDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw ApiError.notFound(
        "Tutorial document not found",
        "チュートリアルドキュメントが見つかりません",
      );
    }

    // ファイル削除
    if (document.fileUrl?.startsWith("/uploads/tutorials/")) {
      try {
        await unlink(join(process.cwd(), "public", document.fileUrl));
      } catch {
        // ignore
      }
    }

    await prisma.tutorialDocument.delete({ where: { id } });

    await AuditService.log({
      action: "TUTORIAL_DOCUMENT_DELETE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      targetId: id,
      targetType: "TutorialDocument",
      details: { title: document.title },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error deleting tutorial document:", error);
    return NextResponse.json(
      { error: "Failed to delete tutorial document" },
      { status: 500 },
    );
  }
}
