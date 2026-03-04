import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "http://localhost:8000";

/**
 * GET /api/ai/rag-documents/content/[filename]
 * ドキュメントのチャンク内容を取得（認証プロキシ）
 * user_id スコープ付き。shared ドキュメントも閲覧可能。
 */
export async function GET(
  request: Request,
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

    // Try user's own document first
    let response = await fetch(
      `${RAG_BACKEND_URL}/api/documents/content/${encodeURIComponent(filename)}?user_id=${encodeURIComponent(userId)}`,
      { signal: AbortSignal.timeout(10000) },
    );

    // If not found, try shared documents
    if (!response.ok && response.status === 404) {
      response = await fetch(
        `${RAG_BACKEND_URL}/api/documents/content/${encodeURIComponent(filename)}?user_id=shared`,
        { signal: AbortSignal.timeout(10000) },
      );
    }

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
    console.error("Error fetching document content:", error);
    return NextResponse.json(
      { error: "Failed to fetch document content" },
      { status: 500 },
    );
  }
}
