/**
 * getRequestBaseUrl ヘルパーのテスト
 *
 * 検証対象:
 * - AUTH_URL が最優先
 * - x-forwarded-host が AUTH_URL のホストと一致した場合のみ forwarded を使う
 * - AUTH_URL 未設定時は request の origin にフォールバック
 * - dev server 0.0.0.0 問題 (Issue #24) の再現 → 修正
 */

import { getRequestBaseUrl } from "@/lib/api/base-url";

function buildReq(opts: {
  url?: string;
  headers?: Record<string, string>;
  nextUrlOrigin?: string;
}) {
  const headers = opts.headers ?? {};
  return {
    url: opts.url ?? "http://localhost:3030/",
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
    ...(opts.nextUrlOrigin
      ? { nextUrl: { origin: opts.nextUrlOrigin } }
      : {}),
  };
}

describe("getRequestBaseUrl", () => {
  const originalAuthUrl = process.env.AUTH_URL;

  afterEach(() => {
    if (originalAuthUrl === undefined) delete process.env.AUTH_URL;
    else process.env.AUTH_URL = originalAuthUrl;
  });

  it("AUTH_URL が最優先される（request の origin は無視）", () => {
    process.env.AUTH_URL = "http://localhost:3030";
    const req = buildReq({
      url: "http://0.0.0.0:3030/api/oidc/authorize",
      nextUrlOrigin: "http://0.0.0.0:3030",
    });
    expect(getRequestBaseUrl(req)).toBe("http://localhost:3030");
  });

  it("AUTH_URL 末尾のスラッシュは除去される", () => {
    process.env.AUTH_URL = "http://localhost:3030/";
    const req = buildReq({});
    expect(getRequestBaseUrl(req)).toBe("http://localhost:3030");
  });

  it("Issue #24: dev server 0.0.0.0 bind でも AUTH_URL が効くことを確認", () => {
    process.env.AUTH_URL = "http://localhost:3030";
    const req = buildReq({
      url: "http://0.0.0.0:3030/api/oidc/authorize?response_type=code",
      nextUrlOrigin: "http://0.0.0.0:3030",
    });
    expect(getRequestBaseUrl(req)).toBe("http://localhost:3030");
  });

  it("x-forwarded-host が AUTH_URL と一致すれば forwarded を優先", () => {
    process.env.AUTH_URL = "http://app.example.com";
    const req = buildReq({
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "app.example.com",
      },
    });
    expect(getRequestBaseUrl(req)).toBe("https://app.example.com");
  });

  it("x-forwarded-host が AUTH_URL と不一致なら AUTH_URL を使う（spoofing 防止）", () => {
    process.env.AUTH_URL = "http://app.example.com";
    const req = buildReq({
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "evil.example.com",
      },
    });
    expect(getRequestBaseUrl(req)).toBe("http://app.example.com");
  });

  it("x-forwarded-proto が http/https 以外なら AUTH_URL を使う（危険スキーム排除）", () => {
    process.env.AUTH_URL = "http://app.example.com";
    const req = buildReq({
      headers: {
        "x-forwarded-proto": "javascript",
        "x-forwarded-host": "app.example.com",
      },
    });
    expect(getRequestBaseUrl(req)).toBe("http://app.example.com");
  });

  it("AUTH_URL 未設定時は nextUrl.origin にフォールバック", () => {
    delete process.env.AUTH_URL;
    const req = buildReq({
      url: "http://localhost:3030/x",
      nextUrlOrigin: "http://localhost:3030",
    });
    expect(getRequestBaseUrl(req)).toBe("http://localhost:3030");
  });

  it("AUTH_URL 未設定 + nextUrl なしなら request.url の origin を使う", () => {
    delete process.env.AUTH_URL;
    const req = buildReq({ url: "http://localhost:3030/foo" });
    expect(getRequestBaseUrl(req)).toBe("http://localhost:3030");
  });
});
