import { NextRequest } from "next/server";

const RAG_BASE_URL = process.env.RAG_BACKEND_URL || "http://localhost:8000";

function getBaseUrl(customUrl?: string): string {
  if (!customUrl || customUrl === "http://localhost:8000") {
    return RAG_BASE_URL;
  }
  return customUrl;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const ragBaseUrl = searchParams.get("ragBaseUrl") || undefined;
    const baseUrl = getBaseUrl(ragBaseUrl);

    const params = new URLSearchParams({ collection: "guest" });
    if (category) params.set("category", category);
    const url = `${baseUrl}/api/documents/list?${params.toString()}`;

    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw new Error(`Failed to list documents: ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({ documents: data.documents || [] }), {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, filename, category, ragBaseUrl } = body;

    if (!content || !filename) {
      return new Response(
        JSON.stringify({ error: "content と filename は必須です" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const baseUrl = getBaseUrl(ragBaseUrl);

    const response = await fetch(`${baseUrl}/api/documents?collection=guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        metadata: {
          title: filename,
          category: category || "general",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload document: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), {
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
