import { NextRequest } from "next/server";

const RAG_BASE_URL = process.env.RAG_BACKEND_URL || "http://localhost:8000";

function getBaseUrl(customUrl?: string): string {
  if (!customUrl || customUrl === "http://localhost:8000") {
    return RAG_BASE_URL;
  }
  return customUrl;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await params;
    const { searchParams } = new URL(request.url);
    const ragBaseUrl = searchParams.get("ragBaseUrl") || undefined;
    const baseUrl = getBaseUrl(ragBaseUrl);

    const response = await fetch(
      `${baseUrl}/api/documents/content/${encodeURIComponent(filename)}`,
      { method: "GET" },
    );

    if (!response.ok) {
      throw new Error(`Failed to get document content: ${response.status}`);
    }

    const content = await response.json();
    return new Response(JSON.stringify(content), {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await params;
    const { searchParams } = new URL(request.url);
    const ragBaseUrl = searchParams.get("ragBaseUrl") || undefined;
    const baseUrl = getBaseUrl(ragBaseUrl);

    const response = await fetch(
      `${baseUrl}/api/documents/${encodeURIComponent(filename)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.status}`);
    }

    return new Response(
      JSON.stringify({ message: "ドキュメントを削除しました" }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
