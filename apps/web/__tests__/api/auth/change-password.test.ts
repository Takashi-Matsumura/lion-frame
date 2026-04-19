/**
 * /api/auth/change-password の契約テスト
 *
 * - 400: validator エラー各種（短い、ブラックリスト、ユーザ情報包含）
 * - 400: 現在のパスワード不一致
 * - 200: 正常変更（監査ログ記録）
 */

export {};

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/services/audit-service", () => ({
  AuditService: { log: mockAuditLog },
}));

const mockAuth = jest.fn();
jest.mock("@/auth", () => ({ auth: () => mockAuth() }));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn(),
};
jest.mock("bcryptjs", () => ({ __esModule: true, default: mockBcrypt }));

const userSession = {
  user: { id: "user-1", email: "user@lionframe.local", role: "USER" },
  expires: "2099-01-01",
};

const jsonRequest = (body: unknown) =>
  new Request("http://localhost:3000/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("/api/auth/change-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("未認証なら 401", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = require("@/app/api/auth/change-password/route");
    const res = await POST(
      jsonRequest({ currentPassword: "x", newPassword: "AbcdefGH1234!@" }),
    );
    expect(res.status).toBe(401);
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it("12 文字未満は 400 TOO_SHORT 相当", async () => {
    mockAuth.mockResolvedValue(userSession);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@lionframe.local",
      name: "User",
      password: "hashed",
      forcePasswordChange: false,
    });
    const { POST } = require("@/app/api/auth/change-password/route");
    const res = await POST(
      jsonRequest({ currentPassword: "ok", newPassword: "short1!" }),
    );
    expect(res.status).toBe(400);
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it("ブラックリスト一致は 400", async () => {
    mockAuth.mockResolvedValue(userSession);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@lionframe.local",
      name: "User",
      password: "hashed",
      forcePasswordChange: false,
    });
    const { POST } = require("@/app/api/auth/change-password/route");
    const res = await POST(
      jsonRequest({ currentPassword: "ok", newPassword: "password123" }),
    );
    expect(res.status).toBe(400);
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it("現在のパスワード不一致は 400", async () => {
    mockAuth.mockResolvedValue(userSession);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@lionframe.local",
      name: "User",
      password: "hashed",
      forcePasswordChange: false,
    });
    mockBcrypt.compare.mockResolvedValue(false);

    const { POST } = require("@/app/api/auth/change-password/route");
    const res = await POST(
      jsonRequest({
        currentPassword: "wrong",
        newPassword: "Zr7!fK2pQn9sW3x@",
      }),
    );
    expect(res.status).toBe(400);
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it("正常変更で 200 と監査ログ記録", async () => {
    mockAuth.mockResolvedValue(userSession);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@lionframe.local",
      name: "User",
      password: "hashed",
      forcePasswordChange: false,
    });
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue("new-hashed");
    mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

    const { POST } = require("@/app/api/auth/change-password/route");
    const res = await POST(
      jsonRequest({
        currentPassword: "ok",
        newPassword: "Zr7!fK2pQn9sW3x@",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PASSWORD_CHANGE",
        category: "AUTH",
        userId: "user-1",
      }),
    );
  });

  it("forcePasswordChange=true なら currentPassword なしで変更可能", async () => {
    mockAuth.mockResolvedValue(userSession);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@lionframe.local",
      name: "User",
      password: "hashed",
      forcePasswordChange: true,
    });
    mockBcrypt.hash.mockResolvedValue("new-hashed");
    mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

    const { POST } = require("@/app/api/auth/change-password/route");
    const res = await POST(
      jsonRequest({
        currentPassword: undefined,
        newPassword: "Zr7!fK2pQn9sW3x@",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });

  it("email ローカル部を含む新パスワードは 400 CONTAINS_USER_INFO", async () => {
    mockAuth.mockResolvedValue(userSession);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "admin@lionframe.local",
      name: null,
      password: "hashed",
      forcePasswordChange: false,
    });
    mockBcrypt.compare.mockResolvedValue(true);

    const { POST } = require("@/app/api/auth/change-password/route");
    const res = await POST(
      jsonRequest({
        currentPassword: "ok",
        newPassword: "myadminSecret7!",
      }),
    );
    expect(res.status).toBe(400);
    expect(mockAuditLog).not.toHaveBeenCalled();
  });
});
