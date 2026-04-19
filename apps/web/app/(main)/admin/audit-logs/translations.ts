export const auditLogsTranslations = {
  en: {
    title: "Audit Logs",

    // Filters
    category: "Category",
    action: "Action",
    allCategories: "All Categories",
    allActions: "All Actions",
    all: "All",

    // Categories
    categoryAuth: "Authentication",
    categoryUserManagement: "User Management",
    categorySystemSetting: "System Settings",
    categoryModule: "Module",

    // Actions
    actionLoginSuccess: "Login Success",
    actionLoginFailure: "Login Failure",
    actionLogout: "Logout",
    actionUserCreate: "User Create",
    actionUserDelete: "User Delete",
    actionRoleChange: "Role Change",
    actionProfileImageUpdate: "Profile Image Update",
    actionProfileImageDelete: "Profile Image Delete",
    actionAiConfigUpdate: "AI Config Update",
    actionModuleToggle: "Module Toggle",
    actionMenuToggle: "Menu Toggle",
    actionAccessKeyPermissionUpdate: "Access Key Permission Update",
    actionAccessKeyCreate: "Access Key Create",
    actionAccessKeyToggle: "Access Key Toggle",
    actionAccessKeyDelete: "Access Key Delete",
    actionAnnouncementCreate: "Announcement Create",
    actionAnnouncementUpdate: "Announcement Update",
    actionAnnouncementDelete: "Announcement Delete",
    actionDataImport: "Data Import",
    actionDataImportCancel: "Data Import Cancel",
    actionDataClear: "Data Clear",
    actionOrganizationPublish: "Organization Publish",
    actionManagerAssign: "Manager Assign",
    actionManagerAutoAssign: "Manager Auto-Assign",
    actionAiChatMessage: "AI Chat Message",
    actionOrgContextToggle: "Org Context Toggle",
    actionSystemDiagnostic: "System Diagnostic",

    // Category badges
    badgeAuth: "Auth",
    badgeUser: "User",
    badgeSystem: "System",
    badgeModule: "Module",

    // Table
    dateTime: "Date/Time",
    user: "User",
    details: "Details",
    total: "Total",

    // Details
    provider: "Provider",
    username: "Username",
    email: "Email",
    reason: "Reason",
    detailTitle: "Title",

    // Pagination
    previous: "Previous",
    next: "Next",

    // Diagnostics
    runDiagnostics: "Run Diagnostics",
    runningDiagnostics: "Running...",
    diagnosticTarget: "Target",
    diagnosticStatus: "Status",
    diagnosticStatusPass: "PASS",
    diagnosticStatusFail: "FAIL",
    diagnosticStatusWarn: "WARN",
    diagnosticDuration: "Duration",

    // States
    loading: "Loading...",
    noAuditLogs: "No audit logs found",
  },
  ja: {
    title: "監査ログ",

    // Filters
    category: "カテゴリ",
    action: "アクション",
    allCategories: "すべてのカテゴリ",
    allActions: "すべてのアクション",
    all: "すべて",

    // Categories
    categoryAuth: "認証",
    categoryUserManagement: "ユーザ管理",
    categorySystemSetting: "システム設定",
    categoryModule: "モジュール",

    // Actions
    actionLoginSuccess: "ログイン成功",
    actionLoginFailure: "ログイン失敗",
    actionLogout: "ログアウト",
    actionUserCreate: "ユーザ作成",
    actionUserDelete: "ユーザ削除",
    actionRoleChange: "ロール変更",
    actionProfileImageUpdate: "プロフィール画像更新",
    actionProfileImageDelete: "プロフィール画像削除",
    actionAiConfigUpdate: "AI設定更新",
    actionModuleToggle: "モジュール切替",
    actionMenuToggle: "メニュー切替",
    actionAccessKeyPermissionUpdate: "アクセスキー権限更新",
    actionAccessKeyCreate: "アクセスキー作成",
    actionAccessKeyToggle: "アクセスキー切替",
    actionAccessKeyDelete: "アクセスキー削除",
    actionAnnouncementCreate: "アナウンス作成",
    actionAnnouncementUpdate: "アナウンス更新",
    actionAnnouncementDelete: "アナウンス削除",
    actionDataImport: "データインポート",
    actionDataImportCancel: "インポート取消",
    actionDataClear: "データ削除",
    actionOrganizationPublish: "組織公開",
    actionManagerAssign: "責任者割当",
    actionManagerAutoAssign: "責任者自動割当",
    actionAiChatMessage: "AIチャット",
    actionOrgContextToggle: "組織データ連携切替",
    actionSystemDiagnostic: "システム診断",

    // Category badges
    badgeAuth: "認証",
    badgeUser: "ユーザ",
    badgeSystem: "システム",
    badgeModule: "モジュール",

    // Table
    dateTime: "日時",
    user: "ユーザ",
    details: "詳細",
    total: "合計",

    // Details
    provider: "プロバイダ",
    username: "ユーザ名",
    email: "メール",
    reason: "理由",
    detailTitle: "タイトル",

    // Pagination
    previous: "前へ",
    next: "次へ",

    // Diagnostics
    runDiagnostics: "診断を実行",
    runningDiagnostics: "実行中...",
    diagnosticTarget: "対象",
    diagnosticStatus: "結果",
    diagnosticStatusPass: "正常",
    diagnosticStatusFail: "異常",
    diagnosticStatusWarn: "警告",
    diagnosticDuration: "処理時間",

    // States
    loading: "読み込み中...",
    noAuditLogs: "監査ログがありません",
  },
} as const;

export type AuditLogsTranslation =
  | (typeof auditLogsTranslations)["en"]
  | (typeof auditLogsTranslations)["ja"];
