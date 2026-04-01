/**
 * NFCカード バックアップ型定義
 */

/** NFCカードバックアップのマニフェスト */
export interface NfcCardBackupManifest {
  version: "1.0";
  module: "nfc-card";
  framework: "LionFrame";
  createdAt: string;
  recordCount: number;
}

/** バックアップ内のNFCカードレコード */
export interface NfcCardBackupRecord {
  id: string;
  cardId: string;
  employeeId: string;
  issuedAt: string;
  revokedAt: string | null;
  isActive: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** NFCカードバックアップファイル全体 */
export interface NfcCardBackupFile {
  manifest: NfcCardBackupManifest;
  data: {
    nfcCards: NfcCardBackupRecord[];
  };
}

/** リストアプレビュー */
export interface NfcCardRestorePreview {
  currentCount: number;
  backupCount: number;
  activeInBackup: number;
  revokedInBackup: number;
}
