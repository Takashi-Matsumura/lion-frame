export {};

/**
 * OIDC Authorize エンドポイント契約テスト
 *
 * 検証対象:
 * - client_id / redirect_uri / response_type / PKCE / scope の各検証
 * - redirect_uri 未検証段階のエラーは JSON、検証済み以降はクエリ付き 302 redirect
 * - 未ログイン時は AuthRequest を永続化して /login?callbackUrl=... へ 302 + cookie
 * - allowedRoles 違反で access_denied redirect + 監査ログ
 * - autoApprove / 既存同意で認可コード発行 + redirect_uri へ 302
 * - 通常フローでは /oidc/consent へ 302 + cookie set
 */

// ============================================================
// Mocks
// ============================================================

const mockAuditLog = jest.fn();
jest.mock("@/lib/services/audit-service", () => ({
  AuditService: { log: mockAuditLog },
}));

const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  SignJWT: class {
    setProtectedHeader() { return this; }
    setIssuer() { return this; }
    setSubject() { return this; }
    setAudience() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    setJti() { return this; }
    sign() { return Promise.resolve("signed.jwt.token"); }
  },
}));

jest.mock("@/lib/services/oidc/keys", () => ({
  getActiveSigningKey: jest.fn(() =>
    Promise.resolve({ kid: "k1", privateKey: "p", publicKey: "q", publicJwk: {} }),
  ),
  findKeyByKid: jest.fn(),
  getPublicJwks: jest.fn(),
}));

const mockPrisma = {
  oIDCClient: { findUnique: jest.fn() },
  oIDCAuthRequest: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  oIDCConsent: {
    findUnique: jest.fn(),
    upsert: jest.fn().mockResolvedValue(undefined),
  },
  oIDCAuthCode: {
    create: jest.fn(),
  },
};
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

jest.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true, remaining: 100, resetMs: 60000 })),
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

beforeAll(() => {
  process.env.OIDC_ISSUER = "http://localhost:3000";
  process.env.AUTH_SECRET = "test-auth-secret-for-cookie-signer";
});

// ============================================================
// Helpers
// ============================================================

function validClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "client_row_1",
    clientId: "client_public_abc",
    clientSecretHash: "hash",
    name: "Test Client",
    description: null,
    redirectUris: ["https://rp.example.lan/callback"],
    allowedScopes: ["openid", "profile", "email"],
    allowedRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
    enabled: true,
    autoApprove: false,
    createdBy: "admin_1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function userSession(role = "USER") {
  return {
    user: {
      id: "user_1",
      email: "u@example.com",
      role,
      language: "ja",
      twoFactorEnabled: false,
      mustChangePassword: false,
    },
    expires: "2099-01-01",
  };
}

function buildAuthorizeUrl(params: Record<string, string>): string {
  const base = "http://localhost:3000/api/oidc/authorize";
  const qs = new URLSearchParams(params).toString();
  return qs ? `${base}?${qs}` : base;
}

function makeRequest(
  urlOrParams: string | Record<string, string>,
  cookies: string[] = [],
): Request {
  const url =
    typeof urlOrParams === "string"
      ? urlOrParams
      : buildAuthorizeUrl(urlOrParams);
  const headers: Record<string, string> = {};
  if (cookies.length > 0) headers.cookie = cookies.join("; ");
  return new Request(url, { method: "GET", headers });
}

const validParams = {
  client_id: "client_public_abc",
  redirect_uri: "https://rp.example.lan/callback",
  response_type: "code",
  scope: "openid profile email",
  state: "state123",
  nonce: "nonce123",
  code_challenge: "x".repeat(43), // 任意の challenge 文字列
  code_challenge_method: "S256",
};

// ============================================================
// Tests
// ============================================================

describe("Authorize エンドポイント契約", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルト: AuthRequest は新規作成される
    mockPrisma.oIDCAuthRequest.create.mockImplementation(
      (args: { data: Record<string, unknown> }) => ({
        id: "authreq_1",
        ...args.data,
      }),
    );
    // デフォルト: 既存 AuthRequest は存在しない
    mockPrisma.oIDCAuthRequest.findUnique.mockResolvedValue(null);
    // デフォルト: Consent も存在しない
    mockPrisma.oIDCConsent.findUnique.mockResolvedValue(null);
    // authCode 発行
    mockPrisma.oIDCAuthCode.create.mockImplementation(
      (args: { data: Record<string, unknown> }) => ({
        id: args.data.id as string,
        ...args.data,
      }),
    );
  });

  // ------------------ 初期検証: JSON エラー ------------------

  it("client_id なしで 400 invalid_request (JSON)", async () => {
    const { client_id, ...rest } = validParams;
    void client_id;
    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(rest));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });

  it("不明な client_id で 400 invalid_client (JSON)", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(null);
    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_client");
  });

  it("クライアント enabled=false で 400 invalid_client", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(
      validClient({ enabled: false }),
    );
    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_client");
  });

  it("redirect_uri 不一致で 400 invalid_request (JSON)", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(validClient());
    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(
      makeRequest({
        ...validParams,
        redirect_uri: "https://evil.example.lan/callback",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(body.error_description).toMatch(/redirect_uri/);
  });

  // ------------------ redirect_uri 検証後: 302 redirect エラー ------------------

  it("response_type != code で redirect_uri に unsupported_response_type を 302 redirect", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(validClient());
    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(
      makeRequest({ ...validParams, response_type: "token" }),
    );
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") as string);
    expect(location.searchParams.get("error")).toBe(
      "unsupported_response_type",
    );
    expect(location.searchParams.get("state")).toBe("state123");
  });

  it("code_challenge 欠如で invalid_request を redirect", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(validClient());
    const { GET } = require("@/app/api/oidc/authorize/route");
    const { code_challenge, ...rest } = validParams;
    void code_challenge;
    const res = await GET(makeRequest(rest));
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.searchParams.get("error")).toBe("invalid_request");
    expect(loc.searchParams.get("error_description")).toMatch(/code_challenge/);
  });

  it("code_challenge_method != S256 で invalid_request を redirect", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(validClient());
    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(
      makeRequest({ ...validParams, code_challenge_method: "plain" }),
    );
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.searchParams.get("error")).toBe("invalid_request");
  });

  it("openid scope 欠如で invalid_scope を redirect", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(validClient());
    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(
      makeRequest({ ...validParams, scope: "profile email" }),
    );
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.searchParams.get("error")).toBe("invalid_scope");
  });

  it("許可外 scope で invalid_scope を redirect", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(
      validClient({ allowedScopes: ["openid", "email"] }), // profile を外している
    );
    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.searchParams.get("error")).toBe("invalid_scope");
    expect(loc.searchParams.get("error_description")).toMatch(/profile/);
  });

  // ------------------ セッション・同意フロー ------------------

  it("未ログイン時: AuthRequest を作成し /login?callbackUrl=... へ 302 + cookie set", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(validClient());
    mockAuth.mockResolvedValue(null);

    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("callbackUrl")).toMatch(
      /\/api\/oidc\/authorize\?resume=/,
    );
    expect(res.headers.get("set-cookie")).toMatch(/oidc_auth_req=/);
    expect(mockPrisma.oIDCAuthRequest.create).toHaveBeenCalled();
  });

  it("allowedRoles 違反で access_denied redirect + 監査ログ", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(
      validClient({ allowedRoles: ["ADMIN"] }),
    );
    mockAuth.mockResolvedValue(userSession("USER"));

    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.searchParams.get("error")).toBe("access_denied");

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OIDC_AUTHORIZE_DENIED",
        category: "OIDC",
        userId: "user_1",
      }),
    );
  });

  it("autoApprove=true のクライアントで認可コードを発行 + redirect_uri へ 302", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(
      validClient({ autoApprove: true }),
    );
    mockAuth.mockResolvedValue(userSession("USER"));

    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.origin + loc.pathname).toBe(
      "https://rp.example.lan/callback",
    );
    expect(loc.searchParams.get("code")).toMatch(/^code_/);
    expect(loc.searchParams.get("state")).toBe("state123");

    // cookie クリア
    expect(res.headers.get("set-cookie")).toMatch(/oidc_auth_req=;/);

    expect(mockPrisma.oIDCConsent.upsert).toHaveBeenCalled();
    expect(mockPrisma.oIDCAuthCode.create).toHaveBeenCalled();
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OIDC_CONSENT_GRANT",
        category: "OIDC",
        details: expect.objectContaining({ auto: true }),
      }),
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OIDC_AUTHORIZE",
        category: "OIDC",
      }),
    );
  });

  it("既存 Consent が要求 scope を包含する場合も code 発行", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(validClient());
    mockAuth.mockResolvedValue(userSession("USER"));
    mockPrisma.oIDCConsent.findUnique.mockResolvedValue({
      id: "consent_1",
      scope: "openid profile email",
      revokedAt: null,
    });

    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.origin + loc.pathname).toBe(
      "https://rp.example.lan/callback",
    );
    expect(loc.searchParams.get("code")).toMatch(/^code_/);
  });

  it("既存 Consent が要求 scope を包含しない場合は /oidc/consent へ", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(validClient());
    mockAuth.mockResolvedValue(userSession("USER"));
    mockPrisma.oIDCConsent.findUnique.mockResolvedValue({
      id: "consent_1",
      scope: "openid", // profile/email が不足
      revokedAt: null,
    });

    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/oidc/consent");
    expect(res.headers.get("set-cookie")).toMatch(/oidc_auth_req=/);
    expect(mockPrisma.oIDCAuthRequest.create).toHaveBeenCalled();
  });

  it("通常フロー: ログイン済み・同意なしで /oidc/consent へ 302 + cookie set", async () => {
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(validClient());
    mockAuth.mockResolvedValue(userSession("USER"));

    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") as string);
    expect(loc.pathname).toBe("/oidc/consent");
    expect(res.headers.get("set-cookie")).toMatch(/oidc_auth_req=/);
    expect(mockPrisma.oIDCAuthRequest.create).toHaveBeenCalled();
    // code は発行しない
    expect(mockPrisma.oIDCAuthCode.create).not.toHaveBeenCalled();
  });

  // ------------------ rate limit ------------------

  it("rate limit 超過で 429", async () => {
    const rl = require("@/lib/services/rate-limiter");
    rl.checkRateLimit.mockReturnValueOnce({
      allowed: false,
      remaining: 0,
      resetMs: 1000,
    });

    const { GET } = require("@/app/api/oidc/authorize/route");
    const res = await GET(makeRequest(validParams));
    expect(res.status).toBe(429);
  });
});
