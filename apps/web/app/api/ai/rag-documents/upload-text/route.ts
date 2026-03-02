import { apiHandler } from "@/lib/api";

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "http://localhost:8000";

/**
 * POST /api/ai/rag-documents/upload-text
 * テキスト貼り付けによるRAGドキュメントアップロード（ユーザー用）
 */
export const POST = apiHandler(async (request, session) => {
  const userId = session.user.id;

  const body = await request.json();
  const { text, filename } = body;

  if (!text || !filename) {
    throw new Error("Text and filename are required");
  }

  const response = await fetch(
    `${RAG_BACKEND_URL}/api/documents/upload-text?user_id=${encodeURIComponent(userId)}`,
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
});
