import { apiHandler } from "@/lib/api";

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "http://localhost:8000";

/**
 * GET /api/ai/rag-documents
 * ユーザー個人のRAGドキュメント一覧を取得（認証プロキシ）
 */
export const GET = apiHandler(async (_request, session) => {
  const userId = session.user.id;

  const response = await fetch(
    `${RAG_BACKEND_URL}/api/documents/list?user_id=${encodeURIComponent(userId)}`,
    { signal: AbortSignal.timeout(5000) },
  );

  if (!response.ok) {
    throw new Error(`RAG backend error: ${response.status}`);
  }

  return response.json();
});

/**
 * POST /api/ai/rag-documents
 * ユーザー個人のRAGドキュメントをアップロード（認証プロキシ）
 */
export const POST = apiHandler(async (request, session) => {
  const userId = session.user.id;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new Error("File is required");
  }

  const backendFormData = new FormData();
  backendFormData.append("file", file);

  const response = await fetch(
    `${RAG_BACKEND_URL}/api/documents/upload?user_id=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      body: backendFormData,
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
