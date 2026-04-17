// OIDC 認可リクエストの永続化・同意レコード管理・authCode 発行
// AuthRequest はログイン中断/同意画面遷移の間、DBに永続化して cookie から handle でリンクする。

import type { OIDCAuthCode, OIDCAuthRequest, OIDCClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  OIDC_AUTH_REQUEST_TTL_SECONDS,
  OIDC_CODE_TTL_SECONDS,
} from "./constants";

export interface CreateAuthRequestInput {
  clientId: string; // OIDCClient.id（内部 ID）
  redirectUri: string;
  scope: string;
  state?: string;
  nonce?: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  responseType: string;
}

export const OIDCConsentService = {
  async createAuthRequest(
    input: CreateAuthRequestInput,
  ): Promise<OIDCAuthRequest> {
    const expiresAt = new Date(Date.now() + OIDC_AUTH_REQUEST_TTL_SECONDS * 1000);
    return prisma.oIDCAuthRequest.create({
      data: {
        clientId: input.clientId,
        redirectUri: input.redirectUri,
        scope: input.scope,
        state: input.state,
        nonce: input.nonce,
        codeChallenge: input.codeChallenge,
        codeChallengeMethod: input.codeChallengeMethod,
        responseType: input.responseType,
        expiresAt,
      },
    });
  },

  async getAuthRequest(id: string): Promise<
    | (OIDCAuthRequest & {
        client: OIDCClient;
      })
    | null
  > {
    const req = await prisma.oIDCAuthRequest.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!req) return null;
    if (req.expiresAt < new Date()) {
      // 期限切れは存在しない扱い
      await prisma.oIDCAuthRequest.delete({ where: { id } }).catch(() => {});
      return null;
    }
    return req;
  },

  async deleteAuthRequest(id: string): Promise<void> {
    await prisma.oIDCAuthRequest.delete({ where: { id } }).catch(() => {});
  },

  async getExistingConsent(
    clientId: string,
    userId: string,
  ): Promise<{ scope: string } | null> {
    const consent = await prisma.oIDCConsent.findUnique({
      where: { clientId_userId: { clientId, userId } },
    });
    if (!consent || consent.revokedAt) return null;
    return { scope: consent.scope };
  },

  /**
   * 既に同意済みで、要求 scope が同意済み scope に包含されているかを判定。
   */
  hasSufficientConsent(
    existingScope: string,
    requestedScope: string,
  ): boolean {
    const existing = new Set(existingScope.split(/\s+/).filter(Boolean));
    const requested = requestedScope.split(/\s+/).filter(Boolean);
    return requested.every((s) => existing.has(s));
  },

  async upsertConsent(input: {
    clientId: string;
    userId: string;
    scope: string;
    autoApproved: boolean;
  }): Promise<void> {
    await prisma.oIDCConsent.upsert({
      where: {
        clientId_userId: {
          clientId: input.clientId,
          userId: input.userId,
        },
      },
      create: {
        clientId: input.clientId,
        userId: input.userId,
        scope: input.scope,
        autoApproved: input.autoApproved,
      },
      update: {
        scope: input.scope,
        autoApproved: input.autoApproved,
        grantedAt: new Date(),
        revokedAt: null,
      },
    });
  },

  /**
   * 認可コードを発行する（一回限り、TTL 120秒）。
   * authCode の ID は opaque な乱数文字列で、これが OIDC 仕様の `code` になる。
   */
  async issueAuthCode(input: {
    clientId: string; // OIDCClient.id
    userId: string;
    redirectUri: string;
    scope: string;
    nonce?: string | null;
    codeChallenge: string;
    codeChallengeMethod: string;
    twoFactorUsed: boolean;
  }): Promise<OIDCAuthCode> {
    const code = `code_${randomBytes(32).toString("base64url")}`;
    const expiresAt = new Date(Date.now() + OIDC_CODE_TTL_SECONDS * 1000);
    return prisma.oIDCAuthCode.create({
      data: {
        id: code,
        clientId: input.clientId,
        userId: input.userId,
        redirectUri: input.redirectUri,
        scope: input.scope,
        nonce: input.nonce ?? null,
        codeChallenge: input.codeChallenge,
        codeChallengeMethod: input.codeChallengeMethod,
        twoFactorUsed: input.twoFactorUsed,
        expiresAt,
      },
    });
  },
};
