import { apiHandler } from "@/lib/api";

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "http://localhost:8000";

/**
 * GET /api/ai/rag-documents
 * ユーザー個人のRAGドキュメント一覧を取得（認証プロキシ）
 */
export const GET = apiHandler(async (_request, session) => {
  const userId = session.user.id;

  // Fetch user's personal documents and shared documents in parallel
  const [userResponse, sharedResponse] = await Promise.all([
    fetch(
      `${RAG_BACKEND_URL}/api/documents/list?user_id=${encodeURIComponent(userId)}`,
      { signal: AbortSignal.timeout(5000) },
    ),
    fetch(
      `${RAG_BACKEND_URL}/api/documents/list?user_id=shared`,
      { signal: AbortSignal.timeout(5000) },
    ).catch(() => null),
  ]);

  if (!userResponse.ok) {
    throw new Error(`RAG backend error: ${userResponse.status}`);
  }

  interface RagDoc {
    filename: string;
    user_id?: string;
    [key: string]: unknown;
  }

  const userData = await userResponse.json();
  const userDocs: RagDoc[] = ((userData.documents || []) as RagDoc[]).map(
    (doc) => ({ ...doc, user_id: doc.user_id ?? userId }),
  );

  // Merge shared documents if available
  let sharedDocs: RagDoc[] = [];
  if (sharedResponse?.ok) {
    const sharedData = await sharedResponse.json();
    sharedDocs = ((sharedData.documents || []) as RagDoc[]).map(
      (doc) => ({ ...doc, user_id: "shared" }),
    );
  }

  // Deduplicate: if same filename exists in both personal and shared, keep personal
  const personalFilenames = new Set(userDocs.map((d) => d.filename));
  const uniqueSharedDocs = sharedDocs.filter((d) => !personalFilenames.has(d.filename));

  // Combine: personal docs first, then shared docs
  const allDocs = [...userDocs, ...uniqueSharedDocs];

  return { documents: allDocs };
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
