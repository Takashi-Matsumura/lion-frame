/**
 * WebAuthn config.ts 単体テスト
 * - RP ID / RP Name / Origin の解決順序
 */

import {
  getExpectedOrigins,
  getRpId,
  getRpName,
} from "@/lib/webauthn/config";

const snapshot = {
  NEXT_PUBLIC_WEBAUTHN_RP_ID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID,
  NEXT_PUBLIC_WEBAUTHN_RP_NAME: process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME,
  WEBAUTHN_ORIGIN: process.env.WEBAUTHN_ORIGIN,
  AUTH_URL: process.env.AUTH_URL,
};

describe("WebAuthn config", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID;
    delete process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME;
    delete process.env.WEBAUTHN_ORIGIN;
    delete process.env.AUTH_URL;
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID = snapshot.NEXT_PUBLIC_WEBAUTHN_RP_ID;
    process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME =
      snapshot.NEXT_PUBLIC_WEBAUTHN_RP_NAME;
    process.env.WEBAUTHN_ORIGIN = snapshot.WEBAUTHN_ORIGIN;
    process.env.AUTH_URL = snapshot.AUTH_URL;
  });

  describe("getRpId", () => {
    it("環境変数が明示指定されていれば優先", () => {
      process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID = "example.com";
      process.env.AUTH_URL = "https://other.example.com";
      expect(getRpId()).toBe("example.com");
    });

    it("AUTH_URL があればそのホスト名", () => {
      process.env.AUTH_URL = "https://auth.example.com/foo";
      expect(getRpId()).toBe("auth.example.com");
    });

    it("何もなければ localhost にフォールバック", () => {
      expect(getRpId()).toBe("localhost");
    });
  });

  describe("getRpName", () => {
    it("環境変数があれば優先", () => {
      process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME = "MyApp";
      expect(getRpName()).toBe("MyApp");
    });

    it("なければ LionFrame", () => {
      expect(getRpName()).toBe("LionFrame");
    });
  });

  describe("getExpectedOrigins", () => {
    it("カンマ区切りで複数 origin を配列化", () => {
      process.env.WEBAUTHN_ORIGIN =
        "http://localhost:3000, https://staging.example.com";
      expect(getExpectedOrigins()).toEqual([
        "http://localhost:3000",
        "https://staging.example.com",
      ]);
    });

    it("AUTH_URL にフォールバック", () => {
      process.env.AUTH_URL = "https://app.example.com";
      expect(getExpectedOrigins()).toEqual(["https://app.example.com"]);
    });

    it("何もなければ localhost:3000", () => {
      expect(getExpectedOrigins()).toEqual(["http://localhost:3000"]);
    });
  });
});
