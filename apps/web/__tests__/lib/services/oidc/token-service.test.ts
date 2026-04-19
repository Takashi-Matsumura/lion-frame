/**
 * OIDC token-service 単体テスト
 * - PKCE (S256) 検証
 * - カスタムクレームマッピング
 */

// Prisma を空のオブジェクトでモック（pure 関数のテストのみ実施）
jest.mock("@/lib/prisma", () => ({
  prisma: {
    oIDCAccessToken: {},
    oIDCAuthCode: {},
    user: {},
  },
}));

jest.mock("@/lib/services/oidc/keys", () => ({
  getActiveSigningKey: jest.fn(),
  findKeyByKid: jest.fn(),
}));

// jose は ESM-only でJestのtransform対象外。pure関数のみテストするのでスタブで十分。
jest.mock("jose", () => ({
  SignJWT: class {
    setProtectedHeader() {
      return this;
    }
    setIssuer() {
      return this;
    }
    setSubject() {
      return this;
    }
    setAudience() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    setJti() {
      return this;
    }
    sign() {
      return Promise.resolve("");
    }
  },
  jwtVerify: jest.fn(),
}));

import { createHash } from "node:crypto";
import type { Role, User } from "@prisma/client";
import {
  buildUserClaims,
  verifyPkceS256,
} from "@/lib/services/oidc/token-service";

function makeS256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

describe("verifyPkceS256", () => {
  it("returns true when verifier matches challenge", () => {
    const verifier = "a".repeat(64);
    const challenge = makeS256Challenge(verifier);
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it("returns false when verifier differs", () => {
    const verifier = "a".repeat(64);
    const challenge = makeS256Challenge("different");
    expect(verifyPkceS256(verifier, challenge)).toBe(false);
  });

  it("returns false for empty verifier", () => {
    expect(verifyPkceS256("", "anything")).toBe(false);
  });

  it("returns false when challenge has different length", () => {
    const verifier = "hello";
    expect(verifyPkceS256(verifier, "short")).toBe(false);
  });
});

function makeUser(partial: Partial<User>): User {
  return {
    id: partial.id ?? "user_1",
    name: partial.name ?? null,
    email: partial.email ?? null,
    emailVerified: partial.emailVerified ?? null,
    image: partial.image ?? null,
    password: null,
    role: (partial.role ?? "USER") as Role,
    language: "ja",
    timezone: "Asia/Tokyo",
    braveApiKey: null,
    systemPrompt: null,
    orgContextEnabled: true,
    lastSignInAt: null,
    forcePasswordChange: false,
    passwordExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
}

describe("buildUserClaims", () => {
  it("includes only sub when scope is openid", () => {
    const user = makeUser({
      id: "u1",
      email: "a@example.com",
      emailVerified: new Date(),
      name: "Alice",
      role: "MANAGER",
    });
    const claims = buildUserClaims(user, "openid", false);
    expect(claims.sub).toBe("u1");
    expect(claims.email).toBeUndefined();
    expect(claims.name).toBeUndefined();
    expect(claims["lion:role"]).toBeUndefined();
  });

  it("includes email claims when scope has email", () => {
    const user = makeUser({
      id: "u1",
      email: "a@example.com",
      emailVerified: new Date(),
    });
    const claims = buildUserClaims(user, "openid email", false);
    expect(claims.email).toBe("a@example.com");
    expect(claims.email_verified).toBe(true);
  });

  it("email_verified is false when emailVerified is null", () => {
    const user = makeUser({
      id: "u1",
      email: "a@example.com",
      emailVerified: null,
    });
    const claims = buildUserClaims(user, "openid email", false);
    expect(claims.email_verified).toBe(false);
  });

  it("includes profile claims including lion:role and lion:mfa_used", () => {
    const user = makeUser({
      id: "u1",
      name: "Alice",
      image: "https://example.com/a.png",
      role: "ADMIN",
    });
    const claims = buildUserClaims(user, "openid profile", true);
    expect(claims.name).toBe("Alice");
    expect(claims.picture).toBe("https://example.com/a.png");
    expect(claims["lion:role"]).toBe("ADMIN");
    expect(claims["lion:mfa_used"]).toBe(true);
  });

  it("lion:mfa_used is false when no MFA was used", () => {
    const user = makeUser({ id: "u1", role: "USER" });
    const claims = buildUserClaims(user, "openid profile", false);
    expect(claims["lion:mfa_used"]).toBe(false);
  });
});
