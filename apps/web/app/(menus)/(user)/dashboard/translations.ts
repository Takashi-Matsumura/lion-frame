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
