export const adminDashboardTranslations = {
  en: {
    tabTitle: "Home",
    // KPI Cards
    totalUsers: "Total Users",
    activeEmployees: "Active Employees",
    unlinkedEmployees: "Unlinked Employees",
    inactiveUsers: "Inactive Users",
    expiredAnnouncements: "Expired Announcements",
    systemHealth: "System Health",
    // KPI Descriptions
    inactiveUsersDesc: "No login for 7+ days",
    unlinkedEmployeesDesc: "Employees without account",
    // Quick Actions
    quickActions: "Quick Actions",
    createAccount: "Create Account from Employee",
    newAnnouncement: "New Announcement",
    dataImport: "Data Import",
    runDiagnostics: "Run Diagnostics",
    running: "Running...",
    // System Health
    systemHealthTitle: "System Health",
    lastRun: "Last run",
    neverRun: "Never run",
    autoRunning: "Auto-running diagnostics...",
    allPassed: "All checks passed",
    failCount: " failed",
    warnCount: " warning(s)",
    // Diagnostic statuses
    pass: "Pass",
    fail: "Fail",
    warn: "Warning",
    // Recent Activity
    recentActivity: "Recent Activity",
    viewAll: "View All",
    noActivity: "No recent activity",
    // Misc
    admins: "Admins",
    managers: "Managers",
    users: "Users",
    guests: "Guests",
    active: "Active",
    expired: "Expired",
    // Usage Stats
    usageStats: "Usage Statistics",
    loginTrend: "Login Trend",
    wau: "WAU",
    mau: "MAU",
    dauMauRatio: "DAU/MAU Ratio",
    featureRanking: "Feature Usage Ranking",
    accessCount: "accesses",
    uniqueUsersLabel: "unique users",
    departmentAdoption: "Adoption by Department",
    adoptionRate: "Adoption Rate",
    aiChatUsage: "AI Chat Usage",
    totalMessages: "Total Messages",
    uniqueUsers: "Unique Users",
    period7d: "7 days",
    period30d: "30 days",
    period90d: "90 days",
    noUsageData: "No usage data available yet",
    aggregating: "Aggregating...",
    people: "people",
  },
  ja: {
    tabTitle: "ホーム",
    // KPI Cards
    totalUsers: "総ユーザ数",
    activeEmployees: "在籍社員数",
    unlinkedEmployees: "未アカウント社員",
    inactiveUsers: "非活性ユーザ",
    expiredAnnouncements: "期限切れアナウンス",
    systemHealth: "システム状態",
    // KPI Descriptions
    inactiveUsersDesc: "7日以上ログインなし",
    unlinkedEmployeesDesc: "アカウント未作成の社員",
    // Quick Actions
    quickActions: "クイックアクション",
    createAccount: "社員からアカウント作成",
    newAnnouncement: "新規アナウンス",
    dataImport: "データインポート",
    runDiagnostics: "診断を実行",
    running: "実行中...",
    // System Health
    systemHealthTitle: "システムヘルス",
    lastRun: "最終実行",
    neverRun: "未実行",
    autoRunning: "自動診断を実行中...",
    allPassed: "全チェック正常",
    failCount: "件の失敗",
    warnCount: "件の警告",
    // Diagnostic statuses
    pass: "正常",
    fail: "失敗",
    warn: "警告",
    // Recent Activity
    recentActivity: "最近のアクティビティ",
    viewAll: "すべて表示",
    noActivity: "最近のアクティビティはありません",
    // Misc
    admins: "管理者",
    managers: "管理職",
    users: "一般",
    guests: "ゲスト",
    active: "有効",
    expired: "期限切れ",
    // Usage Stats
    usageStats: "利用状況",
    loginTrend: "ログイントレンド",
    wau: "WAU",
    mau: "MAU",
    dauMauRatio: "DAU/MAU比率",
    featureRanking: "機能別利用ランキング",
    accessCount: "アクセス",
    uniqueUsersLabel: "ユニークユーザ",
    departmentAdoption: "部門別採用率",
    adoptionRate: "採用率",
    aiChatUsage: "AIチャット利用状況",
    totalMessages: "総メッセージ数",
    uniqueUsers: "ユニークユーザ数",
    period7d: "7日間",
    period30d: "30日間",
    period90d: "90日間",
    noUsageData: "利用データがまだありません",
    aggregating: "集計中...",
    people: "名",
  },
} as const;

export const dashboardTranslations = {
  en: {
    title: "Dashboard",
    // KPI
    totalEmployees: "Total Employees",
    departments: "Departments",
    sections: "Sections",
    courses: "Courses",
    managerRate: "Manager Rate",
    people: "people",
    // Department Composition
    deptCompositionTitle: "Headcount by Department",
    // Position Distribution
    positionDistTitle: "Position Distribution",
    managers: "Managers",
    nonManagers: "General Staff",
    positionNoData: "No position data available",
    // Quick Links
    quickLinksTitle: "Quick Links",
    orgChart: "Organization Chart",
    orgChartDesc: "View organizational structure",
    aiChat: "AI Chat",
    aiChatDesc: "Consult with AI assistant",
    adminPanel: "Admin Panel",
    adminPanelDesc: "System administration",
    // Empty State
    emptyTitle: "No Organization Data",
    emptyDescription:
      "Organization data has not been registered yet. Please import data from the admin panel.",
    emptyAdminButton: "Go to Data Management",
  },
  ja: {
    title: "ダッシュボード",
    // KPI
    totalEmployees: "総社員数",
    departments: "本部数",
    sections: "部数",
    courses: "課数",
    managerRate: "管理職率",
    people: "名",
    // Department Composition
    deptCompositionTitle: "本部別人員構成",
    // Position Distribution
    positionDistTitle: "役職分布",
    managers: "管理職",
    nonManagers: "一般職",
    positionNoData: "役職データがありません",
    // Quick Links
    quickLinksTitle: "クイックリンク",
    orgChart: "組織図",
    orgChartDesc: "組織構造を表示",
    aiChat: "AIチャット",
    aiChatDesc: "AIアシスタントに相談",
    adminPanel: "管理画面",
    adminPanelDesc: "システム管理",
    // Empty State
    emptyTitle: "組織データがありません",
    emptyDescription:
      "組織データが未登録です。管理画面からデータをインポートしてください。",
    emptyAdminButton: "データ管理へ",
  },
} as const;

export type DashboardTranslationKey = keyof typeof dashboardTranslations.en;
