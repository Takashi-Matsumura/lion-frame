import dynamic from "next/dynamic";
import type { ComponentType } from "react";

interface AddonBackupComponentProps {
  language: "en" | "ja";
}

/**
 * アドオンモジュールのバックアップコンポーネントレジストリ
 * モジュールID → バックアップコンポーネントのマッピング
 *
 * 新しいアドオンモジュールにバックアップ機能を追加する場合:
 * 1. モジュール定義に backupProvider を追加
 * 2. バックアップコンポーネントを作成
 * 3. ここにエントリを追加
 */
export const addonBackupComponents: Record<
  string,
  ComponentType<AddonBackupComponentProps>
> = {
  "nfc-card": dynamic(
    () => import("@/lib/addon-modules/nfc-card/backup/NfcCardBackup"),
  ),
};
