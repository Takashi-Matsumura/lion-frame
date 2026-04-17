export {};

/**
 * OIDC Token エンドポイント契約テスト
 *
 * 検証対象:
 * - Content-Type / grant_type / client_id / client_secret の検証
 * - invalid_client / invalid_grant の各エラー条件
 * - PKCE S256 検証（一致 / 不一致 / method違い）
 * - 認可コード一回限り（reuse 検知 → accessToken revoke + 監査ログ）
 * - redirect_uri / client_id の一致検証
 * - 成功時のレスポンス形状 + OIDC_TOKEN_ISSUE 監査ログ
 */

// ============================================================
// Mocks
// ============================================================

const mockAuditLog = jest.fn();
jest.mock("@/lib/services/audit-service", () => ({
  AuditService: { log: mockAuditLog },
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

const mockGetActiveSigningKey = jest.fn();
jest.mock("@/lib/services/oidc/keys", () => ({
  getActiveSigningKey: mockGetActiveSigningKey,
  findKeyByKid: jest.fn(),
  getPublicJwks: jest.fn(),
}));

const mockPrisma = {
  oIDCClient: {
    findUnique: jest.fn(),
  },
  oIDCAuthCode: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  oIDCAccessToken: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

jest.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true, remaining: 100, resetMs: 60000 })),
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

beforeAll(() => {
  process.env.OIDC_ISSUER = "http://localhost:3000";
});

// ============================================================
// Helpers
// ============================================================

const bcrypt = require("bcryptjs");
const { createHash, randomBytes } = require("node:crypto");

function makeFormRequest(
  body: Record<string, string>,
  options: { authHeader?: string; contentType?: string } = {},
): Request {
  const headers: Record<string, string> = {
    "content-type": options.contentType ?? "application/x-www-form-urlencoded",
  };
  if (options.authHeader) headers.authorization = options.authHeader;
  const form = new URLSearchParams(body).toString();
  return new Request("http://localhost:3000/api/oidc/token", {
    method: "POST",
    headers,
    body: form,
  });
}

async function makeClient(
  overrides: Partial<Record<string, unknown>> = {},
): Promise<{ row: Record<string, unknown>; plainSecret: string }> {
  const plainSecret = "test-secret-" + randomBytes(8).toString("hex");
  const hash = await bcrypt.hash(plainSecret, 4); // テスト用に低コスト
  const row = {
    id: "client_row_1",
    clientId: "client_public_abc",
    clientSecretHash: hash,
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
  return { row, plainSecret };
}

function makeAuthCode(
  verifier: string,
  overrides: Partial<Record<string, unknown>> = {},
) {
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return {
    id: "code_xyz",
    clientId: "client_row_1",
    userId: "user_1",
    redirectUri: "https://rp.example.lan/callback",
    scope: "openid profile email",
    nonce: "nonce_1",
    codeChallenge: challenge,
    codeChallengeMethod: "S256",
    twoFactorUsed: true,
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

function validUser() {
  return {
    id: "user_1",
    email: "user@example.com",
    emailVerified: new Date(),
    name: "Test User",
    image: null,
    role: "USER",
    twoFactorEnabled: false,
    // その他不要フィールドは undefined で OK
  };
}

// ============================================================
// Tests
// ============================================================

describe("Token エンドポイント契約", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveSigningKey.mockResolvedValue({
      kid: "k1",
      privateKey: "stub-priv",
      publicKey: "stub-pub",
      publicJwk: {},
    });
  });

  // ------------------ request 形式 ------------------

  it("Content-Type が form でない場合 invalid_request", async () => {
    const { POST } = require("@/app/api/oidc/token/route");
    const req = makeFormRequest({}, { contentType: "application/json" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });

  it("grant_type != authorization_code で unsupported_grant_type", async () => {
    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "client_credentials",
        client_id: "c",
        client_secret: "s",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("unsupported_grant_type");
  });

  // ------------------ client 認証 ------------------

  it("client_id/client_secret 欠如で 401 invalid_client", async () => {
    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({ grant_type: "authorization_code" }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("invalid_client");
  });

  it("誤った client_secret で 401 invalid_client", async () => {
    const { row } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: "wrong",
        code: "x",
        redirect_uri: "x",
        code_verifier: "x",
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("invalid_client");
  });

  it("クライアント enabled=false で invalid_client", async () => {
    const { row, plainSecret } = await makeClient({ enabled: false });
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "x",
        redirect_uri: "x",
        code_verifier: "x",
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("invalid_client");
  });

  it("HTTP Basic での client 認証も受け付ける", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(null); // その後 invalid_grant で止まる

    const basic = Buffer.from(`${row.clientId}:${plainSecret}`).toString(
      "base64",
    );

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest(
        {
          grant_type: "authorization_code",
          code: "x",
          redirect_uri: "x",
          code_verifier: "x",
        },
        { authHeader: `Basic ${basic}` },
      ),
    );
    // client 認証を通り、authCode 検証で invalid_grant になる
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_grant");
  });

  // ------------------ 必須パラメータ ------------------

  it("code / redirect_uri / code_verifier 欠如で invalid_request", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });

  // ------------------ authCode 検証 ------------------

  it("不明な code で invalid_grant (not_found)", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(null);

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "missing",
        redirect_uri: "https://rp.example.lan/callback",
        code_verifier: "v",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_grant");
    expect(body.error_description).toMatch(/not_found/);
  });

  it("期限切れ code で invalid_grant (expired)", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    const verifier = "v".repeat(64);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(
      makeAuthCode(verifier, { expiresAt: new Date(Date.now() - 1000) }),
    );

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "code_xyz",
        redirect_uri: "https://rp.example.lan/callback",
        code_verifier: verifier,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error_description).toMatch(/expired/);
  });

  it("使用済み code (reuse) で invalid_grant + accessToken revoke + 監査ログ", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    const verifier = "v".repeat(64);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(
      makeAuthCode(verifier, { usedAt: new Date() }),
    );
    mockPrisma.oIDCAccessToken.updateMany.mockResolvedValue({ count: 3 });

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "code_xyz",
        redirect_uri: "https://rp.example.lan/callback",
        code_verifier: verifier,
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_grant");
    expect(body.error_description).toMatch(/reuse/);

    // revoke が呼ばれている
    expect(mockPrisma.oIDCAccessToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: "client_row_1",
          userId: "user_1",
          revokedAt: null,
        }),
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );

    // 監査ログ記録
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OIDC_TOKEN_REUSE_DETECTED",
        category: "OIDC",
      }),
    );
  });

  it("競合で updateMany.count=0 の場合も reuse 扱い", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    const verifier = "v".repeat(64);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(makeAuthCode(verifier));
    mockPrisma.oIDCAuthCode.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.oIDCAccessToken.updateMany.mockResolvedValue({ count: 0 });

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "code_xyz",
        redirect_uri: "https://rp.example.lan/callback",
        code_verifier: verifier,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("redirect_uri 不一致で invalid_grant", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    const verifier = "v".repeat(64);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(makeAuthCode(verifier));
    mockPrisma.oIDCAuthCode.updateMany.mockResolvedValue({ count: 1 });

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "code_xyz",
        redirect_uri: "https://different.example.lan/callback",
        code_verifier: verifier,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error_description).toMatch(/redirect_uri/);
  });

  it("他クライアントの code で invalid_grant", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    const verifier = "v".repeat(64);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(
      makeAuthCode(verifier, { clientId: "other_client_row" }),
    );
    mockPrisma.oIDCAuthCode.updateMany.mockResolvedValue({ count: 1 });

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "code_xyz",
        redirect_uri: "https://rp.example.lan/callback",
        code_verifier: verifier,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error_description).toMatch(/not issued to this client/);
  });

  it("codeChallengeMethod != S256 で invalid_grant", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    const verifier = "v".repeat(64);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(
      makeAuthCode(verifier, { codeChallengeMethod: "plain" }),
    );
    mockPrisma.oIDCAuthCode.updateMany.mockResolvedValue({ count: 1 });

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "code_xyz",
        redirect_uri: "https://rp.example.lan/callback",
        code_verifier: verifier,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error_description).toMatch(/code_challenge_method/);
  });

  it("PKCE verifier 不一致で invalid_grant", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    const verifier = "v".repeat(64);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(makeAuthCode(verifier));
    mockPrisma.oIDCAuthCode.updateMany.mockResolvedValue({ count: 1 });

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "code_xyz",
        redirect_uri: "https://rp.example.lan/callback",
        code_verifier: "wrong_verifier",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error_description).toMatch(/code_verifier/);
  });

  // ------------------ 成功系 ------------------

  it("成功: access_token/id_token 返却 + OIDC_TOKEN_ISSUE 監査ログ", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    const verifier = "v".repeat(64);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(makeAuthCode(verifier));
    mockPrisma.oIDCAuthCode.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue(validUser());
    mockPrisma.oIDCAccessToken.create.mockResolvedValue({ id: "jti_1" });

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "code_xyz",
        redirect_uri: "https://rp.example.lan/callback",
        code_verifier: verifier,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = await res.json();
    expect(body.token_type).toBe("Bearer");
    expect(body.access_token).toBeTruthy();
    expect(body.id_token).toBeTruthy();
    expect(body.scope).toBe("openid profile email");
    expect(body.expires_in).toBeGreaterThan(0);

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OIDC_TOKEN_ISSUE",
        category: "OIDC",
        userId: "user_1",
      }),
    );
    // accessToken が DB に記録された
    expect(mockPrisma.oIDCAccessToken.create).toHaveBeenCalled();
  });

  it("成功パスで user が見つからない場合 invalid_grant", async () => {
    const { row, plainSecret } = await makeClient();
    mockPrisma.oIDCClient.findUnique.mockResolvedValue(row);
    const verifier = "v".repeat(64);
    mockPrisma.oIDCAuthCode.findUnique.mockResolvedValue(makeAuthCode(verifier));
    mockPrisma.oIDCAuthCode.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const { POST } = require("@/app/api/oidc/token/route");
    const res = await POST(
      makeFormRequest({
        grant_type: "authorization_code",
        client_id: row.clientId as string,
        client_secret: plainSecret,
        code: "code_xyz",
        redirect_uri: "https://rp.example.lan/callback",
        code_verifier: verifier,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error_description).toMatch(/user not found/);
  });
});
