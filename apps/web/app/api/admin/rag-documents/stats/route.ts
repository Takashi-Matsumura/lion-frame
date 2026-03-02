import { apiHandler } from "@/lib/api";

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "http://localhost:8000";

/**
 * GET /api/admin/rag-documents/stats
 * RAG統計を取得（認証プロキシ）
 */
export const GET = apiHandler(
  async () => {
    const response = await fetch(`${RAG_BACKEND_URL}/api/rag/stats`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`RAG backend error: ${response.status}`);
    }

    return response.json();
  },
  { admin: true },
);
