import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "http://localhost:8000";

/**
 * DELETE /api/ai/rag-documents/[filename]
 * ユーザー個人のRAGドキュメントを削除（認証プロキシ）
 * user_idスコープ付きで削除するため、他ユーザーのドキュメントは削除不可
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const session = await requireAuth();
    const { filename } = await params;
    const userId = session.user.id;

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${RAG_BACKEND_URL}/api/documents/${encodeURIComponent(filename)}?user_id=${encodeURIComponent(userId)}`,
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
    console.error("Error deleting user RAG document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
