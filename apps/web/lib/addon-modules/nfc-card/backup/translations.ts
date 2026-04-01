export const nfcCardBackupTranslations = {
  en: {
    exportTitle: "Export",
    exportDescription:
      "Download NFC card registration data as a JSON file.",
    exportButton: "Create Backup",
    exporting: "Creating backup...",
    exportSuccess: "Backup created and downloaded successfully",
    exportError: "Failed to create backup",

    stats: "Current Data",
    totalCards: "Total Cards",
    activeCards: "Active",
    revokedCards: "Revoked",

    restoreTitle: "Restore",
    restoreDescription:
      "Upload a backup JSON file to restore NFC card data. All current NFC card data will be replaced.",
    restoreWarning:
      "All current NFC card data will be replaced. Make sure to back up the current data first.",
    selectFile: "Select Backup File",
    dropFileHere: "Drop a NFC card backup JSON file here or click to select",
    supportedFormat: "Supported format: JSON (.json)",
    invalidFile: "Invalid NFC card backup file",
    loadingPreview: "Loading preview...",

    previewTitle: "Restore Preview",
    previewCurrent: "Current Records",
    previewBackup: "Backup Records",
    previewActive: "Active in Backup",
    previewRevoked: "Revoked in Backup",

    backupInfo: "Backup Info",
    backupCreatedAt: "Created",

    confirmRestore: "Restore Data",
    restoring: "Restoring...",
    restoreSuccess: "NFC card data restored successfully",
    restoreError: "Failed to restore NFC card data",
    cancelRestore: "Cancel",
    employeeMissing:
      "Some referenced employees do not exist. Please restore core data first.",
  },
  ja: {
    exportTitle: "エクスポート",
    exportDescription:
      "NFCカード登録データをJSON形式でダウンロードします。",
    exportButton: "バックアップを作成",
    exporting: "バックアップを作成中...",
    exportSuccess: "バックアップを作成しダウンロードしました",
    exportError: "バックアップの作成に失敗しました",

    stats: "現在のデータ",
    totalCards: "カード総数",
    activeCards: "有効",
    revokedCards: "無効化済み",

    restoreTitle: "リストア",
    restoreDescription:
      "バックアップJSONファイルをアップロードしてNFCカードデータを復元します。現在のNFCカードデータは全て置き換えられます。",
    restoreWarning:
      "現在のNFCカードデータは全て置き換えられます。事前に現在のデータのバックアップを取得してください。",
    selectFile: "バックアップファイルを選択",
    dropFileHere:
      "NFCカードバックアップJSONファイルをドロップまたはクリックして選択",
    supportedFormat: "対応形式: JSON (.json)",
    invalidFile: "無効なNFCカードバックアップファイルです",
    loadingPreview: "プレビューを読み込み中...",

    previewTitle: "リストアプレビュー",
    previewCurrent: "現在のレコード数",
    previewBackup: "バックアップのレコード数",
    previewActive: "有効カード（バックアップ内）",
    previewRevoked: "無効化カード（バックアップ内）",

    backupInfo: "バックアップ情報",
    backupCreatedAt: "作成日時",

    confirmRestore: "リストア実行",
    restoring: "リストア中...",
    restoreSuccess: "NFCカードデータの復元が完了しました",
    restoreError: "NFCカードデータの復元に失敗しました",
    cancelRestore: "キャンセル",
    employeeMissing:
      "参照先の社員が存在しません。先にコアデータをリストアしてください。",
  },
} as const;
