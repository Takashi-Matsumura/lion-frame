/**
 * キオスクセッション管理サービス
 *
 * セッションの作成・取得・無効化・一覧取得を提供。
 * セッションはトークンベースで、Cookie署名による認証と組み合わせて使用する。
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface CreateSessionInput {
  name: string;
  moduleId: string;
  referenceId?: string;
  createdBy: string;
  expiresAt: Date;
  config?: Prisma.InputJsonValue;
}

/**
 * 新しいキオスクセッションを作成
 */
export async function createSession(data: CreateSessionInput) {
  return prisma.kioskSession.create({
    data: {
      name: data.name,
      moduleId: data.moduleId,
      referenceId: data.referenceId,
      createdBy: data.createdBy,
      expiresAt: data.expiresAt,
      config: data.config ?? undefined,
    },
    include: {
      creator: { select: { name: true } },
      _count: { select: { attendances: true } },
    },
  });
}

/**
 * トークンでセッションを取得（有効性チェック込み）
 */
export async function getSessionByToken(token: string) {
  const session = await prisma.kioskSession.findUnique({
    where: { token },
    include: {
      creator: { select: { name: true } },
      kioskEvent: true,
      _count: { select: { attendances: true } },
    },
  });

  if (!session) return null;
  if (!session.isActive) return null;
  if (session.expiresAt < new Date()) return null;

  return session;
}

/**
 * セッションを無効化
 */
export async function deactivateSession(id: string) {
  return prisma.kioskSession.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * セッション一覧を取得
 */
export async function listSessions(moduleId?: string) {
  return prisma.kioskSession.findMany({
    where: moduleId ? { moduleId } : undefined,
    include: {
      creator: { select: { name: true } },
      _count: { select: { attendances: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
