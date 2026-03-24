import { jaOnly } from "@/lib/i18n/ja-only";

export const editorTranslations = jaOnly({
  title: "エディタ",
  newDocument: "新規作成",
  newMarkdown: "マークダウン",
  newWhiteboard: "ホワイトボード",
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
  open: "開く",
  rename: "名前を変更",
  documentCount: "件のドキュメント",
  lastUpdated: "最終更新",
  created: "作成日",
  editorWindow: "エディタ",
  tags: "タグ",
  filterByTag: "タグで絞り込み",
  allDocuments: "すべて",
  searchDocuments: "ドキュメントを検索...",
  type: "種別",
  noMatchingDocuments: "一致するドキュメントがありません",
});

export type Language = keyof typeof editorTranslations;
