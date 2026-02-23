export const dataManagementTranslations = {
  en: {
    title: "Organization Data Management",
    import: "Import",
    employees: "Employees",
    history: "History",
    organize: "Organization Setup",
    positions: "Position Master",

    // Import Tab
    importTitle: "Import Organization Data",
    importDescription: "Upload Excel file (.xlsx) to import employee data",
    selectFile: "Select File",
    dropFileHere: "Drop file here or click to select",
    supportedFormats: "Supported format: XLSX (.xlsx)",
    downloadTemplate: "Download Template",
    maxFileSize: "Max file size: 10MB",
    preview: "Preview",
    importData: "Import Data",
    importSuccess: "Import completed successfully",
    importError: "Import failed",

    // Preview
    previewTitle: "Import Preview",
    newEmployees: "New Employees",
    updatedEmployees: "Updated Employees",
    transferredEmployees: "Transferred Employees",
    retiredEmployees: "Retired Employees",
    excludedDuplicates: "Excluded Duplicates",
    excludedReason: "Reason",
    keptEmployeeId: "Kept Employee ID",
    errors: "Errors",
    noChanges: "No changes detected",
    confirm: "Confirm Import",
    cancel: "Cancel",
    close: "Close",

    // Employees Tab
    employeesTitle: "Employee List",
    search: "Search",
    searchPlaceholder: "Search by name, ID, or email...",
    filter: "Filter",
    department: "Department",
    section: "Section",
    course: "Course",
    position: "Position",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    all: "All",
    noEmployees: "No employees found",

    // History Tab
    historyTitle: "Change History",
    changeType: "Change Type",
    changedBy: "Changed By",
    changedAt: "Changed At",
    details: "Details",
    noHistory: "No history available",

    // Change Types
    create: "Create",
    update: "Update",
    delete: "Delete",
    transfer: "Transfer",
    promotion: "Promotion",
    retirement: "Retirement",
    rejoining: "Rejoining",
    importType: "Import",
    bulkUpdate: "Bulk Update",

    // Organization
    selectOrganization: "Select Organization",
    createOrganization: "Create Organization",
    organizationName: "Organization Name",
    noOrganization: "No organization available. Please create one first.",

    // Table Headers
    employeeId: "Employee ID",
    name: "Name",
    nameKana: "Name (Kana)",
    email: "Email",
    phone: "Phone",
    joinDate: "Join Date",

    // Actions
    loading: "Loading...",
    save: "Save",
    refresh: "Refresh",
    export: "Export",

    // Options
    markMissingAsRetired: "Mark missing employees as retired",
    markMissingAsRetiredDesc:
      "Employees not in the import file will be marked as retired",

    // Organize Tab
    organizeTitle: "Organization Setup",
    organizeDescription:
      "Assign managers to departments, sections, and courses",
    noImportData: "No import data",
    noImportDataHint: "Import employee data from the Import tab first.",
    manager: "Manager",
    noManager: "No manager assigned",
    assignManager: "Assign Manager",
    changeManager: "Change Manager",
    removeManager: "Remove Manager",
    selectEmployee: "Select Employee",
    managerUpdated: "Manager updated successfully",
    managerRemoved: "Manager removed successfully",
    expandAll: "Expand All",
    collapseAll: "Collapse All",
    showEmployees: "Show Employees",
    hideEmployees: "Hide Employees",
    othersCount: "others",

    // Publish Settings
    publishSettings: "Publish Settings",
    publishSettingsDescription:
      "Set when this organization data will be published",
    organizationStatus: "Status",
    statusDraft: "Draft",
    statusScheduled: "Scheduled",
    statusPublished: "Published",
    statusArchived: "Archived",
    publishAt: "Publish Date",
    publishedAt: "Published At",
    setPublishDate: "Set Publish Date",
    publishNow: "Publish Now",
    schedulePublish: "Schedule Publish",
    cancelSchedule: "Cancel Schedule",
    confirmPublish: "Are you sure you want to publish this organization data?",
    confirmPublishNow:
      "This will make the organization data visible immediately.",
    confirmSchedule:
      "The organization data will be published on the specified date.",
    publishSuccess: "Organization data published successfully",
    scheduleSuccess: "Publish scheduled successfully",
    unpublished: "Not published",
    noPublishDate: "No publish date set",

    // Auto-assign Managers
    autoAssignManagers: "Auto-assign Managers",
    autoAssignConfirmTitle: "Auto-assign Managers",
    autoAssignConfirmMessage:
      "Auto-assign managers based on Position Master settings. Units with existing managers will be skipped.",
    autoAssignExecute: "Execute",
    autoAssignResult: "Assignment Results",
    autoAssignAssigned: "Assigned",
    autoAssignSkippedExisting: "Already assigned",
    autoAssignSkippedNoCandidates: "No candidates",
    autoAssignNoPositionMaster:
      "Please configure Position Master first. Set the management flag and level for each position.",

    // Clear Data
    clearData: "Clear Data",
    clearDataTitle: "Clear Import Data",
    clearDataDescription:
      "Delete all imported data (employees, departments, sections, courses) from this organization. The organization record will be kept.",
    clearDataConfirm:
      "Are you sure? This will permanently delete all imported data. This action cannot be undone.",
    clearDataTypeDelete: 'To confirm, type "DELETE" below.',
    clearDataSuccess: "Data cleared successfully",
    clearingData: "Clearing data...",

    // Import Cancel
    cancelImport: "Cancel Import",
    cancelImportTitle: "Cancel Import",
    cancelImportDescription:
      "This will rollback the import and restore the previous data state.",
    cancelImportConfirm:
      "Are you sure you want to cancel this import? This action cannot be undone.",
    cancelImportSuccess: "Import cancelled successfully",
    cancelImportError: "Failed to cancel import",
    noImportToCancel: "No import to cancel",
    importedAt: "Imported at",
    affectedRecords: "Affected records",
    cancellingImport: "Cancelling import...",
  },
  ja: {
    title: "組織データ管理",
    import: "インポート",
    employees: "社員一覧",
    history: "履歴",
    organize: "組織整備",
    positions: "役職マスタ",

    // Import Tab
    importTitle: "組織データインポート",
    importDescription:
      "Excelファイル（.xlsx）をアップロードして社員データをインポート",
    selectFile: "ファイルを選択",
    dropFileHere: "ここにファイルをドロップまたはクリックして選択",
    supportedFormats: "対応形式: XLSX（.xlsx）",
    downloadTemplate: "テンプレートをダウンロード",
    maxFileSize: "最大ファイルサイズ: 10MB",
    preview: "プレビュー",
    importData: "インポート実行",
    importSuccess: "インポートが完了しました",
    importError: "インポートに失敗しました",

    // Preview
    previewTitle: "インポートプレビュー",
    newEmployees: "新規社員",
    updatedEmployees: "更新社員",
    transferredEmployees: "異動社員",
    retiredEmployees: "退職社員",
    excludedDuplicates: "除外された重複",
    excludedReason: "理由",
    keptEmployeeId: "残した社員番号",
    errors: "エラー",
    noChanges: "変更はありません",
    confirm: "インポート確定",
    cancel: "キャンセル",
    close: "閉じる",

    // Employees Tab
    employeesTitle: "社員一覧",
    search: "検索",
    searchPlaceholder: "氏名、社員番号、メールで検索...",
    filter: "フィルター",
    department: "本部",
    section: "部",
    course: "課",
    position: "役職",
    status: "状態",
    active: "在籍中",
    inactive: "退職",
    all: "すべて",
    noEmployees: "社員が見つかりません",

    // History Tab
    historyTitle: "変更履歴",
    changeType: "変更種別",
    changedBy: "変更者",
    changedAt: "変更日時",
    details: "詳細",
    noHistory: "履歴がありません",

    // Change Types
    create: "新規作成",
    update: "更新",
    delete: "削除",
    transfer: "異動",
    promotion: "昇進",
    retirement: "退職",
    rejoining: "復職",
    importType: "インポート",
    bulkUpdate: "一括更新",

    // Organization
    selectOrganization: "組織を選択",
    createOrganization: "組織を作成",
    organizationName: "組織名",
    noOrganization: "組織がありません。先に組織を作成してください。",

    // Table Headers
    employeeId: "社員番号",
    name: "氏名",
    nameKana: "氏名（フリガナ）",
    email: "メールアドレス",
    phone: "電話番号",
    joinDate: "入社年月日",

    // Actions
    loading: "読み込み中...",
    save: "保存",
    refresh: "更新",
    export: "エクスポート",

    // Options
    markMissingAsRetired: "インポートデータにない社員を退職扱いにする",
    markMissingAsRetiredDesc:
      "インポートファイルに含まれない社員は退職として処理されます",

    // Organize Tab
    organizeTitle: "組織整備",
    organizeDescription: "本部・部・課に責任者を割り当てます",
    noImportData: "インポートデータがありません",
    noImportDataHint: "先にインポートタブから社員データをインポートしてください。",
    manager: "責任者",
    noManager: "責任者未設定",
    assignManager: "責任者を設定",
    changeManager: "責任者を変更",
    removeManager: "責任者を解除",
    selectEmployee: "社員を選択",
    managerUpdated: "責任者を更新しました",
    managerRemoved: "責任者を解除しました",
    expandAll: "すべて展開",
    collapseAll: "すべて折りたたむ",
    showEmployees: "社員を表示",
    hideEmployees: "社員を非表示",
    othersCount: "名",

    // Publish Settings
    publishSettings: "公開設定",
    publishSettingsDescription: "この組織データの公開日を設定します",
    organizationStatus: "ステータス",
    statusDraft: "下書き",
    statusScheduled: "公開予定",
    statusPublished: "公開中",
    statusArchived: "アーカイブ済み",
    publishAt: "公開日",
    publishedAt: "公開日時",
    setPublishDate: "公開日を設定",
    publishNow: "今すぐ公開",
    schedulePublish: "公開を予約",
    cancelSchedule: "予約をキャンセル",
    confirmPublish: "この組織データを公開してもよろしいですか？",
    confirmPublishNow: "組織データがすぐに表示されるようになります。",
    confirmSchedule: "組織データは指定した日時に公開されます。",
    publishSuccess: "組織データを公開しました",
    scheduleSuccess: "公開を予約しました",
    unpublished: "未公開",
    noPublishDate: "公開日未設定",

    // Auto-assign Managers
    autoAssignManagers: "責任者を自動割当",
    autoAssignConfirmTitle: "責任者の自動割当",
    autoAssignConfirmMessage:
      "役職マスタの設定に基づいて、未設定の部署に責任者を自動割当します。既に設定済みの部署はスキップされます。",
    autoAssignExecute: "実行",
    autoAssignResult: "割当結果",
    autoAssignAssigned: "割当済み",
    autoAssignSkippedExisting: "設定済み",
    autoAssignSkippedNoCandidates: "候補なし",
    autoAssignNoPositionMaster:
      "先に役職マスタを設定してください。各役職に管理職フラグとレベルを設定してください。",

    // Clear Data
    clearData: "データ削除",
    clearDataTitle: "インポートデータの削除",
    clearDataDescription:
      "この組織のインポートデータ（社員・本部・部・課）をすべて削除します。組織レコードは残ります。",
    clearDataConfirm:
      "すべてのインポートデータが完全に削除されます。この操作は元に戻せません。",
    clearDataTypeDelete: '確認のため、下に「DELETE」と入力してください。',
    clearDataSuccess: "データを削除しました",
    clearingData: "削除中...",

    // Import Cancel
    cancelImport: "インポート取消",
    cancelImportTitle: "インポート取消",
    cancelImportDescription:
      "インポートをロールバックし、前回の状態に戻します。",
    cancelImportConfirm:
      "このインポートを取り消しますか？この操作は元に戻せません。",
    cancelImportSuccess: "インポートを取り消しました",
    cancelImportError: "インポートの取り消しに失敗しました",
    noImportToCancel: "取り消すインポートがありません",
    importedAt: "インポート日時",
    affectedRecords: "対象レコード数",
    cancellingImport: "取り消し中...",
  },
} as const;

export type DataManagementTranslation =
  | (typeof dataManagementTranslations)["en"]
  | (typeof dataManagementTranslations)["ja"];
