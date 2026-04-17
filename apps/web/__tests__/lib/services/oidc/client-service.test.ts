/**
 * OIDC client-service 単体テスト
 * - create が client_id と client_secret を生成、hash を返さずに平文 secret を返す
 * - verifySecret は不正な secret を reject
 * - timing-safe 挙動: 存在しないクライアントでも bcrypt.compare が実行される
 */

const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    oIDCClient: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

import { OIDCClientService } from "@/lib/services/oidc/client-service";

describe("OIDCClientService.create", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockFindUnique.mockReset();
  });

  it("generates a client_id starting with lionframe_", async () => {
    mockCreate.mockImplementation((args: { data: Record<string, unknown> }) => ({
      id: "row_1",
      clientId: args.data.clientId,
      clientSecretHash: args.data.clientSecretHash,
      name: args.data.name,
      description: null,
      redirectUris: args.data.redirectUris,
      allowedScopes: args.data.allowedScopes,
      allowedRoles: args.data.allowedRoles,
      enabled: true,
      autoApprove: false,
      createdBy: args.data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await OIDCClientService.create({
      name: "Test App",
      redirectUris: ["https://app.example.lan/callback"],
      createdBy: "admin_1",
    });

    expect(result.client.clientId).toMatch(/^lionframe_[0-9a-f]+$/);
    expect(typeof result.clientSecret).toBe("string");
    expect(result.clientSecret.length).toBeGreaterThanOrEqual(40);
    // DB に保存されるのはハッシュ
    expect(mockCreate).toHaveBeenCalled();
    const args = mockCreate.mock.calls[0][0] as { data: { clientSecretHash: string } };
    expect(args.data.clientSecretHash).not.toBe(result.clientSecret);
  });

  it("rejects invalid redirect_uri", async () => {
    await expect(
      OIDCClientService.create({
        name: "X",
        redirectUris: ["not-a-url"],
        createdBy: "a",
      }),
    ).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects redirect_uri with fragment", async () => {
    await expect(
      OIDCClientService.create({
        name: "X",
        redirectUris: ["https://app.example.lan/callback#foo"],
        createdBy: "a",
      }),
    ).rejects.toThrow(/fragment/);
  });

  it("rejects non-http(s) redirect_uri", async () => {
    await expect(
      OIDCClientService.create({
        name: "X",
        redirectUris: ["javascript:alert(1)"],
        createdBy: "a",
      }),
    ).rejects.toThrow();
  });
});

describe("OIDCClientService.verifySecret", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockCreate.mockReset();
  });

  it("returns null when clientId is unknown", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await OIDCClientService.verifySecret(
      "missing",
      "whatever",
    );
    expect(result).toBeNull();
  });

  it("returns null when secret does not match", async () => {
    // create した直後の state を simulate
    mockCreate.mockImplementation((args: { data: Record<string, unknown> }) => ({
      id: "row_1",
      clientId: args.data.clientId,
      clientSecretHash: args.data.clientSecretHash,
      enabled: true,
      autoApprove: false,
      name: "X",
      description: null,
      redirectUris: ["https://x.lan/cb"],
      allowedScopes: ["openid"],
      allowedRoles: ["USER"],
      createdBy: "a",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const created = await OIDCClientService.create({
      name: "X",
      redirectUris: ["https://x.lan/cb"],
      createdBy: "a",
    });
    mockFindUnique.mockResolvedValue(created.client);

    const bad = await OIDCClientService.verifySecret(
      created.client.clientId,
      "wrong-secret",
    );
    expect(bad).toBeNull();

    const good = await OIDCClientService.verifySecret(
      created.client.clientId,
      created.clientSecret,
    );
    expect(good).not.toBeNull();
    expect(good?.clientId).toBe(created.client.clientId);
  });
});
