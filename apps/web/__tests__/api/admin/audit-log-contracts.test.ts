/**
 * 監査ログ契約テスト
 *
 * 各APIエンドポイントが正常処理時に AuditService.log を
 * 正しい action/category で呼び出すことを検証する。
 * 失敗時（認証エラー・バリデーションエラー）にはログが記録されないことも確認。
 */

export {};

// ============================================================
// Mocks
// ============================================================

const mockAuditLog = jest.fn();
jest.mock("@/lib/services/audit-service", () => ({
  AuditService: { log: mockAuditLog },
}));

jest.mock("@/lib/services/notification-service", () => ({
  NotificationService: {
    securityNotify: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("node:fs/promises", () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
}));

const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  systemSetting: {
    upsert: jest.fn(),
  },
  accessKey: {
    findUnique: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    $transaction: jest.fn(),
  },
  $transaction: jest.fn(),
};
jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// ============================================================
// Helpers
// ============================================================

const adminSession = {
  user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
  expires: "2099-01-01",
};

const userSession = {
  user: { id: "user-1", email: "user@example.com", role: "USER" },
  expires: "2099-01-01",
};

const createJsonRequest = (url: string, body: unknown) =>
  new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ============================================================
// Tests
// ============================================================

describe("監査ログ契約テスト", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------
  // AccessKey CRUD
  // ----------------------------------------------------------
  describe("AccessKey CRUD", () => {
    it("AccessKey作成成功時に ACCESS_KEY_CREATE ログが記録される", async () => {
      mockAuth.mockResolvedValue(adminSession);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "target-user",
        name: "Target",
      });

      const mockCreatedKey = {
        id: "key-1",
        name: "Test Key",
        targetUser: { id: "target-user", name: "Target", email: "t@test.com" },
        permissions: [],
      };
      mockPrisma.$transaction.mockResolvedValue(mockCreatedKey);

      const { POST } = require("@/app/api/admin/access-keys/route");
      const response = await POST(
        createJsonRequest("http://localhost:3000/api/admin/access-keys", {
          name: "Test Key",
          expiresAt: "2099-01-01",
          targetUserId: "target-user",
          menuPaths: ["/dashboard"],
        }),
      );

      expect(response.status).toBe(200);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ACCESS_KEY_CREATE",
          category: "SYSTEM_SETTING",
        }),
      );
    });

    it("AccessKey作成で認証なしの場合ログが記録されない", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = require("@/app/api/admin/access-keys/route");
      const response = await POST(
        createJsonRequest("http://localhost:3000/api/admin/access-keys", {
          name: "Test",
          expiresAt: "2099-01-01",
          targetUserId: "user-1",
          menuPaths: ["/dashboard"],
        }),
      );

      expect(response.status).toBe(401);
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it("AccessKey切替成功時に ACCESS_KEY_TOGGLE ログが記録される", async () => {
      mockAuth.mockResolvedValue(adminSession);

      mockPrisma.accessKey.update.mockResolvedValue({
        id: "key-1",
        name: "Test Key",
        isActive: false,
        targetUser: { id: "target-user" },
      });

      const { PATCH } = require("@/app/api/admin/access-keys/route");
      const response = await PATCH(
        new Request("http://localhost:3000/api/admin/access-keys", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "key-1", isActive: false }),
        }),
      );

      expect(response.status).toBe(200);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ACCESS_KEY_TOGGLE",
          category: "SYSTEM_SETTING",
        }),
      );
    });

    it("AccessKey切替でバリデーションエラーの場合ログが記録されない", async () => {
      mockAuth.mockResolvedValue(adminSession);

      const { PATCH } = require("@/app/api/admin/access-keys/route");
      const response = await PATCH(
        new Request("http://localhost:3000/api/admin/access-keys", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "key-1" }),
        }),
      );

      expect(response.status).toBe(400);
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it("AccessKey削除成功時に ACCESS_KEY_DELETE ログが記録される", async () => {
      mockAuth.mockResolvedValue(adminSession);

      mockPrisma.accessKey.findUnique.mockResolvedValue({
        id: "key-1",
        name: "Test Key",
        targetUser: { id: "target-user" },
      });
      mockPrisma.accessKey.delete.mockResolvedValue({});

      const { DELETE } = require("@/app/api/admin/access-keys/route");
      const response = await DELETE(
        new Request("http://localhost:3000/api/admin/access-keys?id=key-1", {
          method: "DELETE",
        }),
      );

      expect(response.status).toBe(200);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ACCESS_KEY_DELETE",
          category: "SYSTEM_SETTING",
        }),
      );
    });

    it("AccessKey削除でID未指定の場合ログが記録されない", async () => {
      mockAuth.mockResolvedValue(adminSession);

      const { DELETE } = require("@/app/api/admin/access-keys/route");
      const response = await DELETE(
        new Request("http://localhost:3000/api/admin/access-keys", {
          method: "DELETE",
        }),
      );

      expect(response.status).toBe(400);
      expect(mockAuditLog).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // Data Import
  // ----------------------------------------------------------
  describe("Data Import", () => {
    it("インポートで認証なしの場合ログが記録されない", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = require("@/app/api/admin/organization/import/route");

      const formData = new FormData();
      formData.append("file", new File(["test"], "test.xlsx"));
      formData.append("organizationId", "org-1");

      const response = await POST(
        new Request("http://localhost:3000/api/admin/organization/import", {
          method: "POST",
          body: formData,
        }),
      );

      expect(response.status).toBe(401);
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it("インポートで非ADMINの場合ログが記録されない", async () => {
      mockAuth.mockResolvedValue(userSession);

      const { POST } = require("@/app/api/admin/organization/import/route");

      const formData = new FormData();
      formData.append("file", new File(["test"], "test.xlsx"));
      formData.append("organizationId", "org-1");

      const response = await POST(
        new Request("http://localhost:3000/api/admin/organization/import", {
          method: "POST",
          body: formData,
        }),
      );

      expect(response.status).toBe(401);
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it("インポートでファイルなしの場合ログが記録されない", async () => {
      mockAuth.mockResolvedValue(adminSession);

      const { POST } = require("@/app/api/admin/organization/import/route");

      const formData = new FormData();
      formData.append("organizationId", "org-1");

      const response = await POST(
        new Request("http://localhost:3000/api/admin/organization/import", {
          method: "POST",
          body: formData,
        }),
      );

      expect(response.status).toBe(400);
      expect(mockAuditLog).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // Profile Image
  // ----------------------------------------------------------
  describe("Profile Image", () => {
    it("画像アップロード成功時に PROFILE_IMAGE_UPDATE ログが記録される", async () => {
      mockAuth.mockResolvedValue(userSession);

      mockPrisma.user.findUnique.mockResolvedValue({ image: null });
      mockPrisma.user.update.mockResolvedValue({});

      const { POST } = require("@/app/api/user/profile-image/route");

      const formData = new FormData();
      const file = new File([new Uint8Array(10)], "test.png", {
        type: "image/png",
      });
      formData.append("file", file);

      const response = await POST(
        new Request("http://localhost:3000/api/user/profile-image", {
          method: "POST",
          body: formData,
        }),
      );

      expect(response.status).toBe(200);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PROFILE_IMAGE_UPDATE",
          category: "USER_MANAGEMENT",
        }),
      );
    });

    it("画像アップロードで認証なしの場合ログが記録されない", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = require("@/app/api/user/profile-image/route");

      const formData = new FormData();
      formData.append(
        "file",
        new File([new Uint8Array(10)], "test.png", { type: "image/png" }),
      );

      const response = await POST(
        new Request("http://localhost:3000/api/user/profile-image", {
          method: "POST",
          body: formData,
        }),
      );

      expect(response.status).toBe(401);
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it("画像削除成功時に PROFILE_IMAGE_DELETE ログが記録される", async () => {
      mockAuth.mockResolvedValue(userSession);

      mockPrisma.user.findUnique.mockResolvedValue({
        image: "/uploads/profile-images/test.png",
      });
      mockPrisma.user.update.mockResolvedValue({});

      const { DELETE } = require("@/app/api/user/profile-image/route");

      const response = await DELETE(
        new Request("http://localhost:3000/api/user/profile-image", {
          method: "DELETE",
        }),
      );

      expect(response.status).toBe(200);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PROFILE_IMAGE_DELETE",
          category: "USER_MANAGEMENT",
        }),
      );
    });

    it("画像削除で認証なしの場合ログが記録されない", async () => {
      mockAuth.mockResolvedValue(null);

      const { DELETE } = require("@/app/api/user/profile-image/route");

      const response = await DELETE(
        new Request("http://localhost:3000/api/user/profile-image", {
          method: "DELETE",
        }),
      );

      expect(response.status).toBe(401);
      expect(mockAuditLog).not.toHaveBeenCalled();
    });
  });
});
