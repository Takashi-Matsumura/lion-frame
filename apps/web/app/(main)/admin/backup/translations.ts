export const backupTranslations = {
  en: {
    title: "Backup",
    description: "Backup and restore core module data",

    // Tabs
    tabCreate: "Create Backup",
    tabHistory: "History",
    tabRestore: "Restore",

    // Create tab
    createTitle: "Create Backup",
    createDescription:
      "Download a backup of core module data as a JSON file. Includes organization structure, employees, history, users, and access control data.",
    createButton: "Create Backup",
    creating: "Creating backup...",
    createSuccess: "Backup created and downloaded successfully",
    createError: "Failed to create backup",
    lastBackup: "Last backup",
    noBackupYet: "No backup has been created yet",
    targetModels: "Included Data",

    // History tab
    historyTitle: "Backup History",
    historyDescription: "Records of past backup operations (metadata only, files are not stored on server)",
    historyDate: "Date",
    historyCreatedBy: "Created By",
    historyRecords: "Records",
    historySize: "File Size",
    historyEmpty: "No backup history",
    historyEmptyDescription: "Create your first backup to see history here",

    // Restore tab
    restoreTitle: "Restore Data",
    restoreDescription:
      "Upload a backup JSON file to restore data. All current core data will be replaced.",
    restoreWarning:
      "This will replace all current core data. Before restoring, a backup of the current data will be downloaded automatically.",
    selectFile: "Select Backup File",
    dropFileHere: "Drop a backup JSON file here or click to select",
    supportedFormat: "Supported format: JSON (.json)",
    previewTitle: "Restore Preview",
    previewModel: "Data",
    previewCurrent: "Current",
    previewBackup: "Backup",
    previewDiff: "Change",
    backupInfo: "Backup Info",
    backupCreatedAt: "Created",
    backupCreatedBy: "Created By",
    confirmRestore: "Restore Data",
    restoring: "Restoring...",
    restoreSuccess: "Data restored successfully",
    restoreError: "Failed to restore data",
    cancelRestore: "Cancel",
    preRestoreBackup: "Downloading current data backup before restore...",
    invalidFile: "Invalid backup file",
    loadingPreview: "Loading preview...",
  },
  ja: {
    title: "バックアップ",
    description: "コアモジュールデータのバックアップとリストア",

    // Tabs
    tabCreate: "バックアップ作成",
    tabHistory: "履歴",
    tabRestore: "リストア",

    // Create tab
    createTitle: "バックアップ作成",
    createDescription:
      "コアモジュールのデータをJSON形式でダウンロードします。組織構造、社員、履歴、ユーザー、アクセス制御のデータが含まれます。",
    createButton: "バックアップを作成",
    creating: "バックアップを作成中...",
    createSuccess: "バックアップを作成しダウンロードしました",
    createError: "バックアップの作成に失敗しました",
    lastBackup: "最終バックアップ",
    noBackupYet: "まだバックアップが作成されていません",
    targetModels: "対象データ",

    // History tab
    historyTitle: "バックアップ履歴",
    historyDescription: "過去のバックアップ実行記録（メタデータのみ、ファイルはサーバーに保存されません）",
    historyDate: "日時",
    historyCreatedBy: "実行者",
    historyRecords: "レコード数",
    historySize: "ファイルサイズ",
    historyEmpty: "バックアップ履歴がありません",
    historyEmptyDescription: "最初のバックアップを作成すると、ここに履歴が表示されます",

    // Restore tab
    restoreTitle: "データ復元",
    restoreDescription:
      "バックアップJSONファイルをアップロードしてデータを復元します。現在のコアデータは全て置き換えられます。",
    restoreWarning:
      "現在のコアデータは全て置き換えられます。リストア実行前に、現在のデータのバックアップが自動でダウンロードされます。",
    selectFile: "バックアップファイルを選択",
    dropFileHere: "バックアップJSONファイルをドロップまたはクリックして選択",
    supportedFormat: "対応形式: JSON (.json)",
    previewTitle: "リストアプレビュー",
    previewModel: "データ",
    previewCurrent: "現在",
    previewBackup: "バックアップ",
    previewDiff: "変化",
    backupInfo: "バックアップ情報",
    backupCreatedAt: "作成日時",
    backupCreatedBy: "作成者",
    confirmRestore: "リストア実行",
    restoring: "リストア中...",
    restoreSuccess: "データの復元が完了しました",
    restoreError: "データの復元に失敗しました",
    cancelRestore: "キャンセル",
    preRestoreBackup: "リストア前に現在のデータをバックアップ中...",
    invalidFile: "無効なバックアップファイルです",
    loadingPreview: "プレビューを読み込み中...",
  },
} as const;

export type BackupTranslation =
  | (typeof backupTranslations)["en"]
  | (typeof backupTranslations)["ja"];
