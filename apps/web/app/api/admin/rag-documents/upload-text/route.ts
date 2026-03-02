import { apiHandler } from "@/lib/api";

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "http://localhost:8000";

/**
 * POST /api/admin/rag-documents/upload-text
 * テキスト貼り付けによるRAGドキュメントアップロード（管理者用）
 */
export const POST = apiHandler(
  async (request) => {
    const body = await request.json();
    const { text, filename } = body;

    if (!text || !filename) {
      throw new Error("Text and filename are required");
    }

    const response = await fetch(
      `${RAG_BACKEND_URL}/api/documents/upload-text?user_id=shared`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, filename }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.detail || `RAG backend error: ${response.status}`,
      );
    }

    return response.json();
  },
  { admin: true },
);
