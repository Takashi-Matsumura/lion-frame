import { NextRequest, NextResponse } from "next/server";
import type { SearchConfig, SearchResult, SearchResponse } from "@lionframe/addon-ai-playground";

// --- Inline Search Providers ---

interface SearchProvider {
  search(query: string, numResults?: number): Promise<SearchResponse>;
}

function createSearchProvider(config: SearchConfig): SearchProvider {
  if (config.provider === "brave" && config.braveApiKey) {
    return new BraveSearchProvider(config.braveApiKey);
  }
  return new DuckDuckGoProvider();
}

class BraveSearchProvider implements SearchProvider {
  private apiKey: string;
  private baseUrl = "https://api.search.brave.com/res/v1/web/search";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, numResults: number = 5): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams({
        q: query,
        count: numResults.toString(),
        safesearch: "moderate",
        search_lang: "ja",
        ui_lang: "ja-JP",
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": this.apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          const fallback = new DuckDuckGoProvider();
          return fallback.search(query, numResults);
        }
        const errorText = await response.text();
        throw new Error(`Brave Search API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const results: SearchResult[] = [];

      if (data.web?.results) {
        for (const item of data.web.results.slice(0, numResults)) {
          results.push({
            title: item.title || "",
            url: item.url || "",
            snippet: item.description || "",
          });
        }
      }

      return { results };
    } catch (error) {
      try {
        const fallback = new DuckDuckGoProvider();
        return fallback.search(query, numResults);
      } catch {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { results: [], error: `検索エラー: ${message}` };
      }
    }
  }
}

class DuckDuckGoProvider implements SearchProvider {
  async search(query: string, numResults: number = 5): Promise<SearchResponse> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.parseResults(html, numResults);
      return { results };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { results: [], error: `検索エラー: ${message}` };
    }
  }

  private parseResults(html: string, limit: number): SearchResult[] {
    const results: SearchResult[] = [];
    const resultRegex =
      /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;

    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < limit) {
      let url = match[1];
      const title = this.cleanText(match[2]);
      const snippet = this.cleanText(match[3]);

      if (url.includes("uddg=")) {
        const uddgMatch = url.match(/uddg=([^&]*)/);
        if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
      }

      if (url && title && !url.includes("duckduckgo.com")) {
        results.push({ title, url, snippet });
      }
    }

    if (results.length === 0) {
      const simpleRegex =
        /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((match = simpleRegex.exec(html)) !== null && results.length < limit) {
        let url = match[1];
        const title = this.cleanText(match[2]);
        if (url.includes("uddg=")) {
          const uddgMatch = url.match(/uddg=([^&]*)/);
          if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
        }
        if (url && title && !url.includes("duckduckgo.com")) {
          results.push({ title, url, snippet: "" });
        }
      }
    }

    return results;
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

async function fetchPageContent(url: string, maxLength: number = 500): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return "";

    const html = await response.text();
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + "...";
    }
    return text;
  } catch {
    return "";
  }
}

// --- Route Handler ---

const DEFAULT_SEARCH_CONFIG: SearchConfig = { provider: "duckduckgo", braveApiKey: "" };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, numResults = 5, fetchContent = false, searchConfig } = body;

    if (!query) {
      return NextResponse.json({ error: "検索クエリが必要です" }, { status: 400 });
    }

    const config: SearchConfig = { ...DEFAULT_SEARCH_CONFIG, ...searchConfig };
    const searchProvider = createSearchProvider(config);
    const response = await searchProvider.search(query, numResults);

    if (response.error) {
      return NextResponse.json({ error: response.error, results: [] }, { status: 500 });
    }

    if (fetchContent && response.results.length > 0) {
      const resultsWithContent = await Promise.all(
        response.results.map(async (result) => {
          const content = await fetchPageContent(result.url);
          return { ...result, snippet: content || result.snippet };
        }),
      );
      return NextResponse.json({ results: resultsWithContent });
    }

    return NextResponse.json({ results: response.results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `検索エラー: ${message}`, results: [] }, { status: 500 });
  }
}
