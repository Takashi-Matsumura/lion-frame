export const workflowApprovalsTranslations = {
  en: {
    title: "Approvals",
    subtitle: "Review and approve workflow requests",
    // Sections
    pendingSection: "Pending Approvals",
    historySection: "Approval History",
    // Table headers
    headerRequester: "Requester",
    headerTitle: "Title",
    headerType: "Type",
    headerSubmittedAt: "Submitted",
    headerStatus: "Status",
    headerDecidedAt: "Decided",
    // Actions
    approve: "Approve",
    reject: "Reject",
    approvedToast: "Request has been approved.",
    rejectedToast: "Request has been rejected.",
    // Status labels
    statusPending: "Pending",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    // Request types
    typeLeave: "Leave Request",
    typeExpense: "Expense Report",
    typePurchase: "Purchase Request",
    typeSickLeave: "Sick Leave",
    // Empty state
    noPending: "No pending approvals",
    noPendingDescription: "All requests have been processed.",
    noHistory: "No approval history",
    // Mock notice
    mockNotice: "This is a sample addon module with mock data.",
  },
  ja: {
    title: "承認",
    subtitle: "申請の確認と承認処理",
    // Sections
    pendingSection: "承認待ち",
    historySection: "承認履歴",
    // Table headers
    headerRequester: "申請者",
    headerTitle: "件名",
    headerType: "種別",
    headerSubmittedAt: "申請日",
    headerStatus: "ステータス",
    headerDecidedAt: "決定日",
    // Actions
    approve: "承認",
    reject: "却下",
    approvedToast: "申請を承認しました。",
    rejectedToast: "申請を却下しました。",
    // Status labels
    statusPending: "承認待ち",
    statusApproved: "承認済",
    statusRejected: "却下",
    // Request types
    typeLeave: "休暇申請",
    typeExpense: "経費精算",
    typePurchase: "購入申請",
    typeSickLeave: "病気欠勤届",
    // Empty state
    noPending: "承認待ちの申請はありません",
    noPendingDescription: "すべての申請が処理済みです。",
    noHistory: "承認履歴はありません",
    // Mock notice
    mockNotice: "これはモックデータを使用したサンプルアドオンモジュールです。",
  },
} as const;

export type Language = keyof typeof workflowApprovalsTranslations;
