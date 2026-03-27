import { NextRequest } from "next/server";

const RAG_BASE_URL = process.env.RAG_BACKEND_URL || "http://localhost:8000";

function getBaseUrl(customUrl?: string): string {
  if (!customUrl || customUrl === "http://localhost:8000") {
    return RAG_BASE_URL;
  }
  return customUrl;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, topK, threshold, category, ragBaseUrl } = body;

    if (!query) {
      return new Response(
        JSON.stringify({ error: "クエリが指定されていません" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const baseUrl = getBaseUrl(ragBaseUrl);

    // Health check
    try {
      const healthRes = await fetch(`${baseUrl}/health`, { method: "GET" });
      if (!healthRes.ok) throw new Error();
    } catch {
      return new Response(
        JSON.stringify({
          error: "RAGサーバーに接続できません。サーバーが起動しているか確認してください。",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const response = await fetch(`${baseUrl}/api/rag/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        top_k: topK ?? 5,
        threshold: threshold ?? 0.3,
        category,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RAG API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ragBaseUrl = searchParams.get("ragBaseUrl") || undefined;
    const baseUrl = getBaseUrl(ragBaseUrl);

    let isHealthy = false;
    try {
      const res = await fetch(`${baseUrl}/health`, { method: "GET" });
      isHealthy = res.ok;
    } catch {
      // not healthy
    }

    return new Response(
      JSON.stringify({
        status: isHealthy ? "healthy" : "unhealthy",
        message: isHealthy
          ? "RAGサーバーは正常に動作しています"
          : "RAGサーバーに接続できません",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ status: "error", message: "ヘルスチェックに失敗しました" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
