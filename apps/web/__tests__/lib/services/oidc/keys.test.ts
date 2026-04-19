/**
 * OIDC keys - getSigningKeyStatus 単体テスト
 *
 * 検証対象:
 * - OIDC_SIGNING_KEYS 未設定で reason="not_set"
 * - 不正な JSON で reason="invalid"
 * - 空配列で reason="invalid"
 */

// jose は ESM-only で Jest の transform 対象外。
// 未設定/不正系のパスでは jose を呼ばないため空スタブで十分。
jest.mock("jose", () => ({
  importJWK: jest.fn(),
  exportJWK: jest.fn(),
}));

import {
  __resetKeyCacheForTest,
  getSigningKeyStatus,
} from "@/lib/services/oidc/keys";

describe("getSigningKeyStatus", () => {
  const originalEnv = process.env.OIDC_SIGNING_KEYS;

  beforeEach(() => {
    __resetKeyCacheForTest();
  });

  afterAll(() => {
    if (originalEnv === undefined) delete process.env.OIDC_SIGNING_KEYS;
    else process.env.OIDC_SIGNING_KEYS = originalEnv;
  });

  it("未設定の場合 reason=not_set を返す", async () => {
    delete process.env.OIDC_SIGNING_KEYS;
    const result = await getSigningKeyStatus();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_set");
      expect(result.message).toMatch(/OIDC_SIGNING_KEYS/);
    }
  });

  it("空文字列の場合も reason=not_set を返す", async () => {
    process.env.OIDC_SIGNING_KEYS = "";
    const result = await getSigningKeyStatus();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_set");
  });

  it("不正な JSON で reason=invalid を返す", async () => {
    process.env.OIDC_SIGNING_KEYS = "{not json";
    const result = await getSigningKeyStatus();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("空配列で reason=invalid を返す", async () => {
    process.env.OIDC_SIGNING_KEYS = "[]";
    const result = await getSigningKeyStatus();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("必須フィールド欠如で reason=invalid を返す", async () => {
    process.env.OIDC_SIGNING_KEYS = JSON.stringify([
      { kid: "k1", status: "active" }, // privateJwk / publicJwk 欠如
    ]);
    const result = await getSigningKeyStatus();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });
});
