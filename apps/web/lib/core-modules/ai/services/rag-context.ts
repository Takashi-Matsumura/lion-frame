/**
 * RAGコンテキストビルダー
 *
 * RAGバックエンド（FastAPI + ChromaDB）に類似検索を行い、
 * 取得したドキュメントをシステムプロンプトに注入するコンテキストを構築する
 */

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "http://localhost:8000";

/**
 * RAGバックエンドの利用可能性を確認し、ドキュメント数を返す
 */
export async function isRagAvailable(): Promise<{
  available: boolean;
  documentCount: number;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${RAG_BACKEND_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { available: false, documentCount: 0 };
    }

    const data = await response.json();
    // chroma_status format: "connected (N documents)"
    const match = data.chroma_status?.match(/\((\d+) documents?\)/);
    const documentCount = match ? parseInt(match[1], 10) : 0;

    return {
      available: data.status === "healthy",
      documentCount,
    };
  } catch {
    return { available: false, documentCount: 0 };
  }
}

/**
 * ユーザーメッセージでRAG検索を行い、コンテキスト文字列を返す
 * userId指定時は個人+共有ドキュメントを検索
 * 失敗時はnullを返す（サイレントフォールバック）
 */
export async function buildRagContext(
  userMessage: string,
  userId?: string,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${RAG_BACKEND_URL}/api/rag/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: userMessage,
        top_k: 5,
        threshold: 0.3,
        ...(userId && { user_id: userId }),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.context || data.context.length === 0) return null;

    return formatRagContext(data.context);
  } catch (error) {
    console.error("Error building RAG context:", error);
    return null;
  }
}

/**
 * 特定ユーザーのRAGドキュメント数を取得
 */
export async function getUserRagDocumentCount(
  userId: string,
): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `${RAG_BACKEND_URL}/api/documents/list?user_id=${encodeURIComponent(userId)}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) return 0;

    const data = await response.json();
    return data.total_count || 0;
  } catch {
    return 0;
  }
}

interface RagContextItem {
  content: string;
  metadata: {
    filename?: string;
    title?: string;
    chunk_index?: number;
    total_chunks?: number;
    [key: string]: unknown;
  };
  score: number;
}

function formatRagContext(items: RagContextItem[]): string {
  let context = "【参考ドキュメント】\n";
  context += `${items.length}件の関連ドキュメントが見つかりました。\n`;

  for (const item of items) {
    const source =
      item.metadata.title || item.metadata.filename || "unknown";
    const score = (item.score * 100).toFixed(1);
    context += `\n--- ${source} (関連度: ${score}%) ---\n`;
    context += item.content;
    context += "\n";
  }

  return context;
}

/**
 * RAGドキュメントを参照する場合のシステムプロンプト拡張文
 */
export const RAG_CONTEXT_SYSTEM_ADDITION = `

あなたは参考ドキュメントにアクセスできます。ユーザーの質問に対して、
提供されたドキュメントの内容に基づいて正確に回答してください。
ドキュメントは「【参考ドキュメント】」セクションとして提供されます。
ドキュメントに含まれない情報については推測せず、その旨を伝えてください。
回答時には参照したドキュメント名を明記してください。`;
