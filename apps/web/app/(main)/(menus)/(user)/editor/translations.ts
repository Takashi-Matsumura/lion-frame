import { jaOnly } from "@/lib/i18n/ja-only";

export const editorTranslations = jaOnly({
  title: "エディタ",
  newDocument: "新規作成",
  untitled: "無題",
  myDocuments: "マイドキュメント",
  sample: "サンプル",
  saved: "保存済み",
  saving: "保存中...",
  deleteTitle: "ドキュメント削除",
  deleteDescription: "このドキュメントを削除しますか？",
  cancel: "キャンセル",
  delete: "削除",
  noDocuments: "ドキュメントがありません",
  noDocumentsDescription: "新規作成ボタンでドキュメントを作成してください",
  loadError: "読み込みに失敗しました",
});

export type Language = keyof typeof editorTranslations;
