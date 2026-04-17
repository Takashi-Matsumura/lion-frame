export {};

/**
 * OIDC Consent エンドポイント (POST /api/oidc/consent) 契約テスト
 *
 * 検証対象:
 * - 未ログインで 401
 * - handle 欠如 / 期限切れで 400
 * - approve=false で access_denied redirect + AuthRequest 削除 + 監査ログ
 * - allowedRoles 違反で access_denied
 * - 成功: Consent upsert + 認可コード発行 + OIDC_CONSENT_GRANT/OIDC_AUTHORIZE 監査ログ + cookie クリア
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
    sign() { return Promise.resolve("signed"); }
  },
}));

jest.mock("@/lib/services/oidc/keys", () => ({
  getActiveSigningKey: jest.fn(),
  findKeyByKid: jest.fn(),
  getPublicJwks: jest.fn(),
}));

const mockPrisma = {
  oIDCAuthRequest: {
    findUnique: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  oIDCConsent: {
    upsert: jest.fn().mockResolvedValue(undefined),
  },
  oIDCAuthCode: {
    create: jest.fn().mockImplementation(
      (args: { data: Record<string, unknown> }) => ({
        id: args.data.id as string,
        ...args.data,
      }),
    ),
  },
};
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

jest.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true, remaining: 100, resetMs: 60000 })),
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

beforeAll(() => {
  process.env.OIDC_ISSUER = "http://localhost:3000";
  process.env.AUTH_SECRET = "test-secret";
});

// ============================================================
// Helpers
// ============================================================

function userSession(role = "USER") {
  return {
    user: {
      id: "user_1",
      email: "u@example.com",
      role,
      twoFactorEnabled: false,
      mustChangePassword: false,
    },
    expires: "2099-01-01",
  };
}

function validAuthRequest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "authreq_1",
    clientId: "client_row_1",
    redirectUri: "https://rp.example.lan/callback",
    scope: "openid profile email",
    state: "state_123",
    nonce: "nonce_123",
    codeChallenge: "c".repeat(43),
    codeChallengeMethod: "S256",
    responseType: "code",
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    client: {
      id: "client_row_1",
      clientId: "client_public_abc",
      allowedRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
    },
    ...overrides,
  };
}

async function makeRequest(
  body: { handle?: string; approve?: boolean },
  options: { signedHandle?: string } = {},
): Promise<Request> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.signedHandle !== undefined) {
    headers.cookie = `oidc_auth_req=${encodeURIComponent(options.signedHandle)}`;
  }
  return new Request("http://localhost:3000/api/oidc/consent", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function signedCookieFor(handle: string): Promise<string> {
  const { signValue } = require("@/lib/services/cookie-signer");
  return signValue(handle);
}

// ============================================================
// Tests
// ============================================================

describe("Consent POST エンドポイント契約", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("未ログインで 401", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = require("@/app/api/oidc/consent/route");
    const res = await POST(await makeRequest({ handle: "x", approve: true }));
    expect(res.status).toBe(401);
  });

  it("handle 欠如で 400 invalid_request", async () => {
    mockAuth.mockResolvedValue(userSession());
    const { POST } = require("@/app/api/oidc/consent/route");
    const res = await POST(await makeRequest({ approve: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });

  it("期限切れ AuthRequest で 400 invalid_request", async () => {
    mockAuth.mockResolvedValue(userSession());
    const signed = await signedCookieFor("authreq_1");
    mockPrisma.oIDCAuthRequest.findUnique.mockResolvedValue(
      validAuthRequest({ expiresAt: new Date(Date.now() - 1000) }),
    );
    // getAuthRequest 内部で削除してから null を返す挙動に任せる

    const { POST } = require("@/app/api/oidc/consent/route");
    const res = await POST(
      await makeRequest({ approve: true }, { signedHandle: signed }),
    );
    expect(res.status).toBe(400);
  });

  it("approve=false で access_denied redirect + AuthRequest 削除 + OIDC_AUTHORIZE_DENIED 監査ログ", async () => {
    mockAuth.mockResolvedValue(userSession());
    const signed = await signedCookieFor("authreq_1");
    mockPrisma.oIDCAuthRequest.findUnique.mockResolvedValue(validAuthRequest());

    const { POST } = require("@/app/api/oidc/consent/route");
    const res = await POST(
      await makeRequest({ approve: false }, { signedHandle: signed }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.redirectTo).toMatch(/^https:\/\/rp\.example\.lan\/callback/);
    const loc = new URL(body.redirectTo);
    expect(loc.searchParams.get("error")).toBe("access_denied");
    expect(loc.searchParams.get("state")).toBe("state_123");

    // cookie クリア
    expect(res.headers.get("set-cookie")).toMatch(/oidc_auth_req=;/);

    // AuthRequest 削除
    expect(mockPrisma.oIDCAuthRequest.delete).toHaveBeenCalledWith({
      where: { id: "authreq_1" },
    });

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OIDC_AUTHORIZE_DENIED",
        category: "OIDC",
        details: expect.objectContaining({ reason: "user_denied" }),
      }),
    );
    // code は発行されない
    expect(mockPrisma.oIDCAuthCode.create).not.toHaveBeenCalled();
  });

  it("allowedRoles 違反で access_denied + AuthRequest 削除（authorize 後にロール変更されたケース）", async () => {
    mockAuth.mockResolvedValue(userSession("USER"));
    const signed = await signedCookieFor("authreq_1");
    mockPrisma.oIDCAuthRequest.findUnique.mockResolvedValue(
      validAuthRequest({
        client: {
          id: "client_row_1",
          clientId: "client_public_abc",
          allowedRoles: ["ADMIN"], // USER は弾かれる
        },
      }),
    );

    const { POST } = require("@/app/api/oidc/consent/route");
    const res = await POST(
      await makeRequest({ approve: true }, { signedHandle: signed }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    const loc = new URL(body.redirectTo);
    expect(loc.searchParams.get("error")).toBe("access_denied");
    expect(mockPrisma.oIDCAuthRequest.delete).toHaveBeenCalled();
    expect(mockPrisma.oIDCAuthCode.create).not.toHaveBeenCalled();
  });

  it("成功: Consent upsert + 認可コード発行 + 監査ログ + cookie クリア", async () => {
    mockAuth.mockResolvedValue(userSession());
    const signed = await signedCookieFor("authreq_1");
    mockPrisma.oIDCAuthRequest.findUnique.mockResolvedValue(validAuthRequest());

    const { POST } = require("@/app/api/oidc/consent/route");
    const res = await POST(
      await makeRequest({ approve: true }, { signedHandle: signed }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    const loc = new URL(body.redirectTo);
    expect(loc.origin + loc.pathname).toBe(
      "https://rp.example.lan/callback",
    );
    expect(loc.searchParams.get("code")).toMatch(/^code_/);
    expect(loc.searchParams.get("state")).toBe("state_123");

    expect(res.headers.get("set-cookie")).toMatch(/oidc_auth_req=;/);

    expect(mockPrisma.oIDCConsent.upsert).toHaveBeenCalled();
    expect(mockPrisma.oIDCAuthCode.create).toHaveBeenCalled();
    expect(mockPrisma.oIDCAuthRequest.delete).toHaveBeenCalled();

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OIDC_CONSENT_GRANT",
        category: "OIDC",
        details: expect.objectContaining({ auto: false }),
      }),
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OIDC_AUTHORIZE",
        category: "OIDC",
      }),
    );
  });
});
