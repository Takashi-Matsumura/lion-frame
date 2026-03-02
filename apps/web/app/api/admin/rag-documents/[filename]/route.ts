import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "http://localhost:8000";

/**
 * DELETE /api/admin/rag-documents/[filename]
 * RAGドキュメントを削除（認証プロキシ、管理者のみ）
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    await requireAdmin();
    const { filename } = await params;

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${RAG_BACKEND_URL}/api/documents/${encodeURIComponent(filename)}`,
      {
        method: "DELETE",
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.detail || `RAG backend error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting RAG document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
