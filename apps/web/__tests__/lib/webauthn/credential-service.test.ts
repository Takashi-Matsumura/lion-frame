/**
 * WebAuthnCredentialService 単体テスト
 * - 最終 1 件削除ガードのロジック
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    webAuthnCredential: {
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { CredentialService } from "@/lib/webauthn/credential-service";

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
  };
  webAuthnCredential: {
    count: jest.Mock;
  };
};

const db = prisma as unknown as PrismaMock;

describe("CredentialService.canUserRemoveCredential", () => {
  it("パスワードがあれば最後の 1 件でも削除可能", async () => {
    db.user.findUnique.mockResolvedValueOnce({ password: "hash" });
    db.webAuthnCredential.count.mockResolvedValueOnce(1);

    await expect(
      CredentialService.canUserRemoveCredential("u1"),
    ).resolves.toBe(true);
  });

  it("パスワード無し・パスキー 1 件なら削除拒否", async () => {
    db.user.findUnique.mockResolvedValueOnce({ password: null });
    db.webAuthnCredential.count.mockResolvedValueOnce(1);

    await expect(
      CredentialService.canUserRemoveCredential("u1"),
    ).resolves.toBe(false);
  });

  it("パスワード無しでもパスキー 2 件以上なら削除可能", async () => {
    db.user.findUnique.mockResolvedValueOnce({ password: null });
    db.webAuthnCredential.count.mockResolvedValueOnce(2);

    await expect(
      CredentialService.canUserRemoveCredential("u1"),
    ).resolves.toBe(true);
  });

  it("存在しないユーザは削除不可", async () => {
    db.user.findUnique.mockResolvedValueOnce(null);
    db.webAuthnCredential.count.mockResolvedValueOnce(0);

    await expect(
      CredentialService.canUserRemoveCredential("missing"),
    ).resolves.toBe(false);
  });
});
