// OIDC クライアントの CRUD + secret ハッシュ管理
// client_secret は bcrypt(10) でハッシュ保存し、平文は登録/再生成時の一度だけ呼び出し元に返す。

import type { OIDCClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 10;

export interface CreateClientInput {
  name: string;
  description?: string;
  redirectUris: string[];
  allowedScopes?: string[];
  allowedRoles?: Role[];
  autoApprove?: boolean;
  createdBy: string;
}

export interface UpdateClientInput {
  name?: string;
  description?: string | null;
  redirectUris?: string[];
  allowedScopes?: string[];
  allowedRoles?: Role[];
  enabled?: boolean;
  autoApprove?: boolean;
}

export interface ClientWithPlainSecret {
  client: OIDCClient;
  clientSecret: string; // 平文 — 呼び出し元で一度だけ表示
}

function generateClientId(): string {
  // lionframe 固有 prefix で識別しやすくする
  return `lionframe_${randomBytes(12).toString("hex")}`;
}

function generateClientSecret(): string {
  // 256bit のランダム文字列（URL-safe base64）
  return randomBytes(32).toString("base64url");
}

function validateRedirectUris(uris: string[]): void {
  if (!Array.isArray(uris) || uris.length === 0) {
    throw new Error("redirect_uris must be a non-empty array");
  }
  for (const uri of uris) {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      throw new Error(`Invalid redirect_uri: ${uri}`);
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`redirect_uri must use http/https: ${uri}`);
    }
    if (parsed.hash) {
      throw new Error(`redirect_uri must not contain fragment: ${uri}`);
    }
  }
}

export const OIDCClientService = {
  async list(): Promise<OIDCClient[]> {
    return prisma.oIDCClient.findMany({ orderBy: { createdAt: "desc" } });
  },

  async getById(id: string): Promise<OIDCClient | null> {
    return prisma.oIDCClient.findUnique({ where: { id } });
  },

  async getByClientId(clientId: string): Promise<OIDCClient | null> {
    return prisma.oIDCClient.findUnique({ where: { clientId } });
  },

  async create(input: CreateClientInput): Promise<ClientWithPlainSecret> {
    validateRedirectUris(input.redirectUris);
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const clientSecretHash = await bcrypt.hash(clientSecret, BCRYPT_ROUNDS);

    const client = await prisma.oIDCClient.create({
      data: {
        clientId,
        clientSecretHash,
        name: input.name,
        description: input.description,
        redirectUris: input.redirectUris,
        allowedScopes: input.allowedScopes ?? ["openid", "profile", "email"],
        allowedRoles: input.allowedRoles ?? [
          "USER",
          "MANAGER",
          "EXECUTIVE",
          "ADMIN",
        ],
        autoApprove: input.autoApprove ?? false,
        createdBy: input.createdBy,
      },
    });
    return { client, clientSecret };
  },

  async update(id: string, input: UpdateClientInput): Promise<OIDCClient> {
    if (input.redirectUris) validateRedirectUris(input.redirectUris);
    return prisma.oIDCClient.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        redirectUris: input.redirectUris,
        allowedScopes: input.allowedScopes,
        allowedRoles: input.allowedRoles,
        enabled: input.enabled,
        autoApprove: input.autoApprove,
      },
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.oIDCClient.delete({ where: { id } });
  },

  async regenerateSecret(id: string): Promise<ClientWithPlainSecret> {
    const clientSecret = generateClientSecret();
    const clientSecretHash = await bcrypt.hash(clientSecret, BCRYPT_ROUNDS);
    const client = await prisma.oIDCClient.update({
      where: { id },
      data: { clientSecretHash },
    });
    return { client, clientSecret };
  },

  /**
   * client_secret を検証する。timing attack を避けるため、
   * クライアントが見つからなくても bcrypt.compare を実行してダミー比較する。
   */
  async verifySecret(
    clientId: string,
    clientSecret: string,
  ): Promise<OIDCClient | null> {
    const client = await this.getByClientId(clientId);
    // timing-safe: クライアント未存在でも常に bcrypt を 1 回実行
    const hashToCompare =
      client?.clientSecretHash ??
      "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
    const match = await bcrypt.compare(clientSecret, hashToCompare);
    if (!client || !match) return null;
    return client;
  },
};
