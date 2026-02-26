import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { estimateTokens } from "@/lib/core-modules/ai";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/admin/tutorial-documents
 * 全チュートリアルドキュメント一覧（管理者のみ）
 */
export async function GET() {
  try {
    await requireAdmin();

    const documents = await prisma.tutorialDocument.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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

/**
 * POST /api/admin/tutorial-documents
 * PDFアップロード + テキスト抽出 + DB保存（管理者のみ）
 */
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const titleJa = (formData.get("titleJa") as string) || null;
    const description = (formData.get("description") as string) || null;
    const descriptionJa = (formData.get("descriptionJa") as string) || null;
    const suggestedPromptsRaw =
      (formData.get("suggestedPrompts") as string) || "[]";

    if (!file) {
      throw ApiError.badRequest("No file uploaded", "ファイルがアップロードされていません");
    }

    if (!title) {
      throw ApiError.badRequest("Title is required", "タイトルは必須です");
    }

    // MIME検証
    if (file.type !== "application/pdf") {
      throw ApiError.badRequest(
        "Only PDF files are allowed",
        "PDFファイルのみアップロード可能です",
      );
    }

    // サイズ制限: 20MB
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      throw ApiError.badRequest(
        "File too large. Maximum size is 20MB",
        "ファイルサイズが大きすぎます。最大20MBです",
      );
    }

    // suggestedPrompts のパース
    let suggestedPrompts: { text: string; textJa?: string }[] = [];
    try {
      suggestedPrompts = JSON.parse(suggestedPromptsRaw);
    } catch {
      suggestedPrompts = [];
    }

    // PDFバッファを取得
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // テキスト抽出
    let extractedText = "";
    let pageCount = 0;
    try {
      const pdf = new PDFParse({ data: new Uint8Array(buffer) });
      const info = await pdf.getInfo();
      const textResult = await pdf.getText();
      extractedText = textResult.text;
      pageCount = info.total;
      await pdf.destroy();
    } catch (err) {
      console.error("PDF parse error:", err);
      throw ApiError.badRequest(
        "Failed to parse PDF file",
        "PDFファイルの解析に失敗しました",
      );
    }

    // トークン概算
    const tokens = estimateTokens(extractedText);

    // ファイル保存
    const timestamp = Date.now();
    const cuid = crypto.randomUUID().replace(/-/g, "").slice(0, 25);
    const filename = `${cuid}-${timestamp}.pdf`;
    const baseDir = resolve(process.cwd(), "public", "uploads", "tutorials");

    // ディレクトリ確保
    await mkdir(baseDir, { recursive: true });

    const filepath = resolve(baseDir, filename);

    // パストラバーサル防止
    if (!filepath.startsWith(baseDir)) {
      throw ApiError.badRequest("Invalid filename");
    }

    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/tutorials/${filename}`;

    // DB保存
    const document = await prisma.tutorialDocument.create({
      data: {
        title,
        titleJa,
        description,
        descriptionJa,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        pageCount,
        extractedText,
        estimatedTokens: tokens,
        suggestedPrompts: JSON.parse(JSON.stringify(suggestedPrompts)),
        createdBy: session.user.id,
      },
    });

    await AuditService.log({
      action: "TUTORIAL_DOCUMENT_CREATE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      targetId: document.id,
      targetType: "TutorialDocument",
      details: { title, pageCount, estimatedTokens: tokens },
    }).catch(() => {});

    return NextResponse.json({ success: true, document }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error creating tutorial document:", error);
    return NextResponse.json(
      { error: "Failed to create tutorial document" },
      { status: 500 },
    );
  }
}
