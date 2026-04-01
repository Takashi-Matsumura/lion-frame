/**
 * NFCカード バックアップサービス
 */

import { prisma } from "@/lib/prisma";
import type {
  NfcCardBackupFile,
  NfcCardBackupRecord,
  NfcCardRestorePreview,
} from "./types";

export class NfcCardBackupService {
  /**
   * NFCカードデータをエクスポート
   */
  static async exportBackup(): Promise<{ file: NfcCardBackupFile; json: string }> {
    const cards = await prisma.nfcCard.findMany({
      orderBy: { createdAt: "asc" },
    });

    const nfcCards: NfcCardBackupRecord[] = cards.map((card) => ({
      id: card.id,
      cardId: card.cardId,
      employeeId: card.employeeId,
      issuedAt: card.issuedAt.toISOString(),
      revokedAt: card.revokedAt?.toISOString() ?? null,
      isActive: card.isActive,
      note: card.note,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    }));

    const file: NfcCardBackupFile = {
      manifest: {
        version: "1.0",
        module: "nfc-card",
        framework: "LionFrame",
        createdAt: new Date().toISOString(),
        recordCount: nfcCards.length,
      },
      data: { nfcCards },
    };

    const json = JSON.stringify(file, null, 2);
    return { file, json };
  }

  /**
   * リストアプレビュー
   */
  static async previewRestore(
    backup: NfcCardBackupFile,
  ): Promise<NfcCardRestorePreview> {
    const currentCount = await prisma.nfcCard.count();
    const activeInBackup = backup.data.nfcCards.filter((c) => c.isActive).length;
    const revokedInBackup = backup.data.nfcCards.length - activeInBackup;

    return {
      currentCount,
      backupCount: backup.data.nfcCards.length,
      activeInBackup,
      revokedInBackup,
    };
  }

  /**
   * リストア実行（全置換）
   */
  static async executeRestore(
    backup: NfcCardBackupFile,
  ): Promise<{ restored: number }> {
    // 参照先Employeeの存在チェック
    const employeeIds = [
      ...new Set(backup.data.nfcCards.map((c) => c.employeeId)),
    ];
    const existingEmployees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingEmployees.map((e) => e.id));
    const missingIds = employeeIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      throw new Error(
        `Referenced employees not found: ${missingIds.length} employee(s). Restore core data first.`,
      );
    }

    return prisma.$transaction(async (tx) => {
      // 既存データを全削除
      await tx.nfcCard.deleteMany();

      // バックアップデータを挿入
      for (const card of backup.data.nfcCards) {
        await tx.nfcCard.create({
          data: {
            id: card.id,
            cardId: card.cardId,
            employeeId: card.employeeId,
            issuedAt: new Date(card.issuedAt),
            revokedAt: card.revokedAt ? new Date(card.revokedAt) : null,
            isActive: card.isActive,
            note: card.note,
            createdAt: new Date(card.createdAt),
            updatedAt: new Date(card.updatedAt),
          },
        });
      }

      return { restored: backup.data.nfcCards.length };
    });
  }

  /**
   * バックアップファイルのバリデーション
   */
  static validateBackupFile(data: unknown): data is NfcCardBackupFile {
    if (!data || typeof data !== "object") return false;
    const file = data as Record<string, unknown>;
    if (!file.manifest || typeof file.manifest !== "object") return false;
    const manifest = file.manifest as Record<string, unknown>;
    if (manifest.version !== "1.0") return false;
    if (manifest.module !== "nfc-card") return false;
    if (manifest.framework !== "LionFrame") return false;
    if (!file.data || typeof file.data !== "object") return false;
    const fileData = file.data as Record<string, unknown>;
    if (!Array.isArray(fileData.nfcCards)) return false;
    return true;
  }
}
