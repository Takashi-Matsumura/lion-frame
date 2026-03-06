export const formsTranslations = {
  en: {
    title: "Forms",
    subtitle: "View and respond to published forms",
    // Status
    answered: "Answered",
    notAnswered: "Not Answered",
    closed: "Closed",
    // Empty
    noForms: "No forms available",
    noFormsDescription: "Published forms will appear here.",
    // Answer page
    submit: "Submit",
    submitting: "Submitting...",
    submitted: "Your response has been submitted.",
    confirmTitle: "Submit Response",
    confirmDescription: "Are you sure you want to submit your response? This cannot be undone.",
    confirm: "Confirm",
    cancel: "Cancel",
    back: "Back to forms",
    // Progress
    sectionOf: "Section {current} of {total}",
    next: "Next",
    previous: "Previous",
    // Errors
    loadError: "Failed to load forms.",
    submitError: "Failed to submit response.",
    requiredField: "This field is required.",
    alreadySubmitted: "You have already submitted this form.",
    formClosed: "This form is no longer accepting responses.",
    // Description
    by: "by",
    responses: "responses",
  },
  ja: {
    title: "フォーム",
    subtitle: "公開フォームの閲覧と回答",
    // ステータス
    answered: "回答済み",
    notAnswered: "未回答",
    closed: "締切",
    // 空状態
    noForms: "フォームがありません",
    noFormsDescription: "公開されたフォームがここに表示されます。",
    // 回答ページ
    submit: "送信",
    submitting: "送信中...",
    submitted: "回答を送信しました。",
    confirmTitle: "回答を送信",
    confirmDescription: "回答を送信しますか？この操作は取り消せません。",
    confirm: "確認",
    cancel: "キャンセル",
    back: "フォーム一覧に戻る",
    // 進捗
    sectionOf: "セクション {current}/{total}",
    next: "次へ",
    previous: "戻る",
    // エラー
    loadError: "フォームの読み込みに失敗しました。",
    submitError: "回答の送信に失敗しました。",
    requiredField: "この項目は必須です。",
    alreadySubmitted: "このフォームは既に回答済みです。",
    formClosed: "このフォームは回答を受け付けていません。",
    // 説明
    by: "作成者:",
    responses: "件の回答",
  },
} as const;

export type Language = keyof typeof formsTranslations;
