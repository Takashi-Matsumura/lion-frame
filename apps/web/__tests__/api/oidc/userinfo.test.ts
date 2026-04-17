export {};

/**
 * OIDC UserInfo エンドポイント契約テスト
 *
 * 検証対象:
 * - Bearer 未指定 / 空 Bearer → 401 invalid_token + WWW-Authenticate
 * - 署名検証失敗 → 401 invalid_token
 * - DB 側で revoke / expired → 401 invalid_token
 * - user not found → 401 invalid_token
 * - 成功時: scope 別クレーム返却 + OIDC_USERINFO_ACCESS 監査ログ
 */

// ============================================================
// Mocks
// ============================================================

const mockAuditLog = jest.fn();
jest.mock("@/lib/services/audit-service", () => ({
  AuditService: { log: mockAuditLog },
}));

// jose は ESM-only のため Jest から直接 import 不可
const mockJwtVerify = jest.fn();
jest.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
  SignJWT: class {
    setProtectedHeader() { return this; }
    setIssuer() { return this; }
    setSubject() { return this; }
    setAudience() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    setJti() { return this; }
    sign() { return Promise.resolve("stub.jwt.token"); }
  },
}));

const mockFindKeyByKid = jest.fn();
jest.mock("@/lib/services/oidc/keys", () => ({
  findKeyByKid: mockFindKeyByKid,
  getActiveSigningKey: jest.fn(),
  getPublicJwks: jest.fn(),
}));

const mockPrisma = {
  oIDCAccessToken: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

// rate limiter は常に allow（契約テストでは429を発火させない）
jest.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true, remaining: 100, resetMs: 60000 })),
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

// OIDC_ISSUER を環境変数に
beforeAll(() => {
  process.env.OIDC_ISSUER = "http://localhost:3000";
});

// ============================================================
// Helpers
// ============================================================

function makeRequest(
  authHeader?: string,
  method: "GET" | "POST" = "GET",
): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.authorization = authHeader;
  return new Request("http://localhost:3000/api/oidc/userinfo", {
    method,
    headers,
  });
}

function validDbRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "jti_1",
    clientId: "client_row_1",
    userId: "user_1",
    scope: "openid profile email",
    tokenHash: "hash",
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function validUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user_1",
    email: "user@example.com",
    emailVerified: new Date(),
    name: "Test User",
    image: "https://example.com/a.png",
    role: "MANAGER",
    language: "ja",
    timezone: "Asia/Tokyo",
    braveApiKey: null,
    systemPrompt: null,
    orgContextEnabled: true,
    lastSignInAt: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    forcePasswordChange: false,
    passwordExpiresAt: null,
    password: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// base64url でヘッダー { kid: "k1" } を作って JWT 風の文字列にする
function makeFakeJwt(kid = "k1"): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid }))
    .toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "user_1" }))
    .toString("base64url");
  return `${header}.${payload}.fakesignature`;
}

// ============================================================
// Tests
// ============================================================

describe("UserInfo エンドポイント契約", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Authorization ヘッダなしで 401 invalid_token", async () => {
    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toMatch(/Bearer error="invalid_token"/);
    const body = await res.json();
    expect(body.error).toBe("invalid_token");
  });

  it("Bearer が空文字のみで 401 invalid_token", async () => {
    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest("Bearer "));
    expect(res.status).toBe(401);
  });

  it("Bearer 以外のスキーマ（Basic等）で 401", async () => {
    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest("Basic abc"));
    expect(res.status).toBe(401);
  });

  it("kid 欠如の JWT で 401 invalid_token", async () => {
    // kid の無いトークン
    const headerNoKid = Buffer.from(JSON.stringify({ alg: "RS256" })).toString(
      "base64url",
    );
    const payload = Buffer.from(JSON.stringify({ sub: "x" })).toString(
      "base64url",
    );
    const token = `${headerNoKid}.${payload}.sig`;

    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest(`Bearer ${token}`));
    expect(res.status).toBe(401);
    expect(mockFindKeyByKid).not.toHaveBeenCalled();
  });

  it("kid に対応する鍵が見つからない場合 401", async () => {
    mockFindKeyByKid.mockResolvedValue(null);
    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest(`Bearer ${makeFakeJwt("unknown_kid")}`));

    expect(res.status).toBe(401);
    expect(mockFindKeyByKid).toHaveBeenCalledWith("unknown_kid");
  });

  it("署名検証エラーで 401", async () => {
    mockFindKeyByKid.mockResolvedValue({
      kid: "k1",
      publicKey: "stub-public-key",
    });
    mockJwtVerify.mockRejectedValue(new Error("signature verification failed"));

    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest(`Bearer ${makeFakeJwt()}`));

    expect(res.status).toBe(401);
  });

  it("DB に行がない場合 401（revoke 後や DB 削除後）", async () => {
    mockFindKeyByKid.mockResolvedValue({
      kid: "k1",
      publicKey: "stub-public-key",
    });
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "user_1", aud: "client_1", scope: "openid profile" },
    });
    mockPrisma.oIDCAccessToken.findUnique.mockResolvedValue(null);

    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest(`Bearer ${makeFakeJwt()}`));

    expect(res.status).toBe(401);
  });

  it("DB 行が revokedAt != null で 401", async () => {
    mockFindKeyByKid.mockResolvedValue({ kid: "k1", publicKey: "pk" });
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "user_1", aud: "client_1", scope: "openid profile" },
    });
    mockPrisma.oIDCAccessToken.findUnique.mockResolvedValue(
      validDbRow({ revokedAt: new Date() }),
    );

    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest(`Bearer ${makeFakeJwt()}`));

    expect(res.status).toBe(401);
  });

  it("DB 行が expiresAt < 現在で 401", async () => {
    mockFindKeyByKid.mockResolvedValue({ kid: "k1", publicKey: "pk" });
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "user_1", aud: "client_1", scope: "openid profile" },
    });
    mockPrisma.oIDCAccessToken.findUnique.mockResolvedValue(
      validDbRow({ expiresAt: new Date(Date.now() - 1000) }),
    );

    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest(`Bearer ${makeFakeJwt()}`));

    expect(res.status).toBe(401);
  });

  it("user not found で 401", async () => {
    mockFindKeyByKid.mockResolvedValue({ kid: "k1", publicKey: "pk" });
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "user_1", aud: "client_1", scope: "openid profile" },
    });
    mockPrisma.oIDCAccessToken.findUnique.mockResolvedValue(validDbRow());
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest(`Bearer ${makeFakeJwt()}`));

    expect(res.status).toBe(401);
  });

  it("成功時: sub/email/profile クレーム返却 + 監査ログ記録", async () => {
    mockFindKeyByKid.mockResolvedValue({ kid: "k1", publicKey: "pk" });
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user_1",
        aud: "client_abc",
        scope: "openid profile email",
      },
    });
    mockPrisma.oIDCAccessToken.findUnique.mockResolvedValue(validDbRow());
    mockPrisma.user.findUnique.mockResolvedValue(validUser());

    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest(`Bearer ${makeFakeJwt()}`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sub).toBe("user_1");
    expect(body.email).toBe("user@example.com");
    expect(body.email_verified).toBe(true);
    expect(body.name).toBe("Test User");
    expect(body["lion:role"]).toBe("MANAGER");

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OIDC_USERINFO_ACCESS",
        category: "OIDC",
        userId: "user_1",
      }),
    );
  });

  it("scope が openid のみの場合、email/profile クレームは含まれない", async () => {
    mockFindKeyByKid.mockResolvedValue({ kid: "k1", publicKey: "pk" });
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "user_1", aud: "client_1", scope: "openid" },
    });
    mockPrisma.oIDCAccessToken.findUnique.mockResolvedValue(
      validDbRow({ scope: "openid" }),
    );
    mockPrisma.user.findUnique.mockResolvedValue(validUser());

    const { GET } = require("@/app/api/oidc/userinfo/route");
    const res = await GET(makeRequest(`Bearer ${makeFakeJwt()}`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sub).toBe("user_1");
    expect(body.email).toBeUndefined();
    expect(body.name).toBeUndefined();
    expect(body["lion:role"]).toBeUndefined();
  });

  it("POST でも GET と同じ契約で動作する", async () => {
    mockFindKeyByKid.mockResolvedValue({ kid: "k1", publicKey: "pk" });
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "user_1", aud: "client_1", scope: "openid profile" },
    });
    mockPrisma.oIDCAccessToken.findUnique.mockResolvedValue(validDbRow());
    mockPrisma.user.findUnique.mockResolvedValue(validUser());

    const { POST } = require("@/app/api/oidc/userinfo/route");
    const res = await POST(makeRequest(`Bearer ${makeFakeJwt()}`, "POST"));
    expect(res.status).toBe(200);
  });
});
