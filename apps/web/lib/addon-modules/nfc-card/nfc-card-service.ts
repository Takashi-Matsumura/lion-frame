/**
 * NFCカード サービスレイヤー
 *
 * NFCカードと社員情報の紐付けに関するビジネスロジック。
 * 1社員1有効カードポリシー。無効化は論理削除（履歴保持）。
 */

import { prisma } from "@/lib/prisma";

/**
 * 社員番号で社員を検索（NFCカード情報付き）
 */
export async function searchEmployee(employeeId: string) {
  return prisma.employee.findFirst({
    where: {
      employeeId,
      isActive: true,
    },
    include: {
      department: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      nfcCards: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * NFCカードを登録（社員に紐付け）
 *
 * - 同カードIDが有効な場合はエラー
 * - 同カードIDが無効化済みの場合は再有効化
 * - 社員の既存有効カードは自動無効化（1社員1有効カード）
 */
export async function registerCard(cardId: string, employeeId: string) {
  const existing = await prisma.nfcCard.findUnique({
    where: { cardId },
  });

  if (existing?.isActive) {
    throw new Error(`このカードは既に登録されています（社員ID: ${existing.employeeId}）`);
  }

  // 社員の既存アクティブカードを無効化
  await prisma.nfcCard.updateMany({
    where: { employeeId, isActive: true },
    data: { isActive: false, revokedAt: new Date() },
  });

  // 無効化済みの同カードが存在すれば再有効化、なければ新規作成
  if (existing) {
    return prisma.nfcCard.update({
      where: { id: existing.id },
      data: {
        employeeId,
        isActive: true,
        issuedAt: new Date(),
        revokedAt: null,
      },
      include: {
        employee: { select: { name: true, employeeId: true } },
      },
    });
  }

  return prisma.nfcCard.create({
    data: { cardId, employeeId },
    include: {
      employee: { select: { name: true, employeeId: true } },
    },
  });
}

/**
 * NFCカードを無効化（論理削除）
 */
export async function revokeCard(id: string) {
  return prisma.nfcCard.update({
    where: { id },
    data: { isActive: false, revokedAt: new Date() },
  });
}

/**
 * NFCカード一覧（管理用）
 */
export async function listCards(options?: {
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const where = options?.activeOnly ? { isActive: true } : {};

  return prisma.nfcCard.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: {
      employee: {
        select: {
          name: true,
          employeeId: true,
          position: true,
          department: { select: { name: true } },
        },
      },
    },
  });
}
