import { prisma } from "@/lib/prisma";

export type CredentialSummary = {
  id: string;
  credentialId: string;
  nickname: string | null;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
};

type CreateInput = {
  userId: string;
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  nickname?: string | null;
};

const SUMMARY_SELECT = {
  id: true,
  credentialId: true,
  nickname: true,
  transports: true,
  deviceType: true,
  backedUp: true,
  createdAt: true,
  lastUsedAt: true,
} as const;

export const CredentialService = {
  async listByUser(userId: string): Promise<CredentialSummary[]> {
    return prisma.webAuthnCredential.findMany({
      where: { userId },
      select: SUMMARY_SELECT,
      orderBy: { createdAt: "desc" },
    });
  },

  async findByCredentialId(credentialId: string) {
    return prisma.webAuthnCredential.findUnique({
      where: { credentialId },
    });
  },

  async create(input: CreateInput) {
    return prisma.webAuthnCredential.create({
      data: {
        userId: input.userId,
        credentialId: input.credentialId,
        publicKey: Buffer.from(input.publicKey),
        counter: BigInt(input.counter),
        transports: input.transports,
        deviceType: input.deviceType,
        backedUp: input.backedUp,
        nickname: input.nickname ?? null,
      },
      select: SUMMARY_SELECT,
    });
  },

  async updateCounter(id: string, newCounter: number) {
    return prisma.webAuthnCredential.update({
      where: { id },
      data: {
        counter: BigInt(newCounter),
        lastUsedAt: new Date(),
      },
    });
  },

  async updateNickname(id: string, userId: string, nickname: string | null) {
    const result = await prisma.webAuthnCredential.updateMany({
      where: { id, userId },
      data: { nickname },
    });
    return result.count > 0;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await prisma.webAuthnCredential.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  },

  async deleteForce(id: string): Promise<boolean> {
    try {
      await prisma.webAuthnCredential.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async countByUser(userId: string): Promise<number> {
    return prisma.webAuthnCredential.count({ where: { userId } });
  },

  /**
   * 削除可能かを判定。パスワード無し・2FA 無し・パスキー残 1 件の場合は false を返す。
   */
  async canUserRemoveCredential(userId: string): Promise<boolean> {
    const [user, credentialCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, twoFactorEnabled: true },
      }),
      prisma.webAuthnCredential.count({ where: { userId } }),
    ]);
    if (!user) return false;
    const hasOtherFactor = user.password !== null || user.twoFactorEnabled;
    if (hasOtherFactor) return true;
    return credentialCount > 1;
  },
};
