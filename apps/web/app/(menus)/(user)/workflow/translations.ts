export const workflowTranslations = {
  en: {
    title: "Requests",
    subtitle: "Submit and track your workflow requests",
    newRequest: "New Request",
    newRequestToast: "New request form will be available in a future update.",
    // Filters
    filterAll: "All",
    filterDraft: "Draft",
    filterPending: "Pending",
    filterApproved: "Approved",
    filterRejected: "Rejected",
    // Table headers
    headerTitle: "Title",
    headerType: "Type",
    headerStatus: "Status",
    headerSubmittedAt: "Submitted",
    headerApprover: "Approver",
    // Status labels
    statusDraft: "Draft",
    statusPending: "Pending",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    // Request types
    typeLeave: "Leave Request",
    typeExpense: "Expense Report",
    typePurchase: "Purchase Request",
    typeSickLeave: "Sick Leave",
    // Empty state
    noRequests: "No requests found",
    noRequestsDescription: "Create a new request to get started.",
    // Mock notice
    mockNotice: "This is a sample addon module with mock data.",
  },
  ja: {
    title: "申請",
    subtitle: "申請の作成と進捗確認",
    newRequest: "新規申請",
    newRequestToast: "新規申請フォームは今後のアップデートで追加予定です。",
    // Filters
    filterAll: "すべて",
    filterDraft: "下書き",
    filterPending: "承認待ち",
    filterApproved: "承認済",
    filterRejected: "却下",
    // Table headers
    headerTitle: "件名",
    headerType: "種別",
    headerStatus: "ステータス",
    headerSubmittedAt: "申請日",
    headerApprover: "承認者",
    // Status labels
    statusDraft: "下書き",
    statusPending: "承認待ち",
    statusApproved: "承認済",
    statusRejected: "却下",
    // Request types
    typeLeave: "休暇申請",
    typeExpense: "経費精算",
    typePurchase: "購入申請",
    typeSickLeave: "病気欠勤届",
    // Empty state
    noRequests: "申請がありません",
    noRequestsDescription: "新規申請を作成してください。",
    // Mock notice
    mockNotice: "これはモックデータを使用したサンプルアドオンモジュールです。",
  },
} as const;

export type Language = keyof typeof workflowTranslations;
