import { NextRequest, NextResponse } from "next/server";

async function getLlamaCppContextSize(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<number | null> {
  try {
    const propsUrl = baseUrl.replace(/\/v1\/?$/, "") + "/props";
    const response = await fetch(propsUrl, { method: "GET", headers });
    if (response.ok) {
      const data = await response.json();
      const nCtx = data.default_generation_settings?.n_ctx;
      if (typeof nCtx === "number" && nCtx > 0) return nCtx;
    }
  } catch {
    // ignore
  }
  return null;
}

async function getOllamaContextSize(
  baseUrl: string,
  modelName: string,
  headers: Record<string, string>,
): Promise<number | null> {
  try {
    const showUrl = baseUrl.replace(/\/v1\/?$/, "") + "/api/show";
    const response = await fetch(showUrl, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
    });
    if (response.ok) {
      const data = await response.json();
      const modelInfo = data.model_info || {};
      for (const key of Object.keys(modelInfo)) {
        if (key.includes("context_length") || key.includes("context_window")) {
          const value = modelInfo[key];
          if (typeof value === "number" && value > 0) return value;
        }
      }
      const parameters = data.parameters || "";
      const match = parameters.match(/num_ctx\s+(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
  } catch {
    // ignore
  }
  return null;
}

async function getOpenAICompatContextSize(
  modelsData: { data?: Array<{ context_window?: number; context_length?: number }> },
): Promise<number | null> {
  try {
    const models = modelsData.data || [];
    for (const model of models) {
      const ctxSize = model.context_window || model.context_length;
      if (typeof ctxSize === "number" && ctxSize > 0) return ctxSize;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey, model, provider } = await request.json();

    if (!baseUrl) {
      return NextResponse.json({ error: "baseUrl is required" }, { status: 400 });
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/models`, { method: "GET", headers });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${response.statusText}`, details: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    const models = data.data || data.models || [];
    const allModelNames = models.map(
      (m: { id?: string; name?: string; model?: string }) =>
        m.id || m.name || m.model || "unknown",
    );
    const modelNames = allModelNames.slice(0, 3);

    let contextSize: number | null = null;
    contextSize = await getOpenAICompatContextSize(data);

    if (!contextSize && (provider === "llama-cpp" || !provider)) {
      contextSize = await getLlamaCppContextSize(baseUrl, headers);
    }

    if (!contextSize && (provider === "ollama" || !provider) && model) {
      contextSize = await getOllamaContextSize(baseUrl, model, headers);
    }

    return NextResponse.json({
      success: true,
      modelCount: models.length,
      modelNames,
      allModelNames,
      contextSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
