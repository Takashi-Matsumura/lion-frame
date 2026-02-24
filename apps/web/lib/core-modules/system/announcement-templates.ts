// ============================================================
// Announcement Templates — コード定義テンプレート
// 派生プロジェクトは registerTemplates() で拡張可能
// ============================================================

export interface TemplatePlaceholder {
  key: string;
  label: string;
  labelJa: string;
  type: "text" | "date" | "time" | "datetime-local";
  defaultValue?: () => string;
}

export type TemplateCategory = "maintenance" | "security" | "update" | "general";

export interface AnnouncementTemplate {
  id: string;
  category: TemplateCategory;
  name: string;
  nameJa: string;
  title: string;
  titleJa: string;
  message: string;
  messageJa: string;
  level: "info" | "warning" | "critical";
  notifyUsers: boolean;
  placeholders: TemplatePlaceholder[];
}

// --- カテゴリ表示名 ---

export const TEMPLATE_CATEGORY_LABELS: Record<
  TemplateCategory,
  { en: string; ja: string }
> = {
  maintenance: { en: "Maintenance", ja: "メンテナンス" },
  security: { en: "Security", ja: "セキュリティ" },
  update: { en: "Updates", ja: "アップデート" },
  general: { en: "General", ja: "一般" },
};

// --- ヘルパー ---

/** 今日の日付を yyyy-MM-dd 形式で返す */
const todayISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** 言語に応じた日付フォーマット */
function formatDate(isoDate: string, lang: "en" | "ja"): string {
  if (!isoDate) return "";
  const [, m, d] = isoDate.split("-");
  if (!m || !d) return isoDate;
  const month = Number.parseInt(m, 10);
  const day = Number.parseInt(d, 10);
  return lang === "ja" ? `${month}月${day}日` : `${month}/${day}`;
}

/** テンプレート文字列中の {{key}} をプレースホルダー値で置換 */
export function applyPlaceholders(
  template: string,
  values: Record<string, string>,
  lang: "en" | "ja",
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const raw = values[key];
    if (raw === undefined) return match;
    // date型の値は言語に応じてフォーマット
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return formatDate(raw, lang);
    }
    return raw;
  });
}

// --- 組み込みテンプレート ---

const BUILTIN_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: "scheduled-maintenance",
    category: "maintenance",
    name: "Scheduled Maintenance",
    nameJa: "定期メンテナンス予定",
    title: "Scheduled Maintenance on {{date}}",
    titleJa: "{{date}} 定期メンテナンスのお知らせ",
    message:
      "System maintenance is scheduled on {{date}} from {{startTime}} to {{endTime}}. The system may be temporarily unavailable during this period.",
    messageJa:
      "{{date}} {{startTime}}〜{{endTime}} にシステムメンテナンスを実施します。この間、システムが一時的にご利用いただけない場合があります。",
    level: "warning",
    notifyUsers: true,
    placeholders: [
      {
        key: "date",
        label: "Date",
        labelJa: "日付",
        type: "date",
        defaultValue: todayISO,
      },
      {
        key: "startTime",
        label: "Start Time",
        labelJa: "開始時刻",
        type: "time",
        defaultValue: () => "02:00",
      },
      {
        key: "endTime",
        label: "End Time",
        labelJa: "終了時刻",
        type: "time",
        defaultValue: () => "04:00",
      },
    ],
  },
  {
    id: "emergency-maintenance",
    category: "maintenance",
    name: "Emergency Maintenance",
    nameJa: "緊急メンテナンス",
    title: "Emergency Maintenance in Progress",
    titleJa: "緊急メンテナンス実施中",
    message:
      "An emergency maintenance is currently in progress due to {{cause}}. Estimated recovery time: {{recoveryTime}}. We apologize for the inconvenience.",
    messageJa:
      "{{cause}}のため、緊急メンテナンスを実施中です。復旧見込み: {{recoveryTime}}。ご不便をおかけし申し訳ございません。",
    level: "critical",
    notifyUsers: true,
    placeholders: [
      {
        key: "cause",
        label: "Cause",
        labelJa: "原因",
        type: "text",
      },
      {
        key: "recoveryTime",
        label: "Est. Recovery Time",
        labelJa: "復旧見込み時刻",
        type: "time",
      },
    ],
  },
  {
    id: "security-update",
    category: "security",
    name: "Security Update",
    nameJa: "セキュリティアップデート",
    title: "Security Update Applied",
    titleJa: "セキュリティアップデートのお知らせ",
    message:
      "A security update has been applied to the system. Details: {{details}}. No action is required on your part.",
    messageJa:
      "システムにセキュリティアップデートを適用しました。詳細: {{details}}。ユーザー側の対応は不要です。",
    level: "warning",
    notifyUsers: true,
    placeholders: [
      {
        key: "details",
        label: "Details",
        labelJa: "詳細",
        type: "text",
      },
    ],
  },
  {
    id: "version-upgrade",
    category: "update",
    name: "Version Upgrade",
    nameJa: "バージョンアップ",
    title: "System Updated to v{{version}}",
    titleJa: "システムを v{{version}} にアップデートしました",
    message:
      "The system has been updated to version {{version}}. {{details}}",
    messageJa:
      "システムをバージョン {{version}} にアップデートしました。{{details}}",
    level: "info",
    notifyUsers: true,
    placeholders: [
      {
        key: "version",
        label: "Version",
        labelJa: "バージョン",
        type: "text",
      },
      {
        key: "details",
        label: "Details",
        labelJa: "詳細",
        type: "text",
      },
    ],
  },
  {
    id: "new-feature",
    category: "update",
    name: "New Feature Release",
    nameJa: "新機能リリース",
    title: "New Feature: {{featureName}}",
    titleJa: "新機能「{{featureName}}」をリリースしました",
    message:
      "A new feature \"{{featureName}}\" is now available. {{details}}",
    messageJa:
      "新機能「{{featureName}}」が利用可能になりました。{{details}}",
    level: "info",
    notifyUsers: false,
    placeholders: [
      {
        key: "featureName",
        label: "Feature Name",
        labelJa: "機能名",
        type: "text",
      },
      {
        key: "details",
        label: "Details",
        labelJa: "詳細",
        type: "text",
      },
    ],
  },
  {
    id: "general-notice",
    category: "general",
    name: "General Notice",
    nameJa: "一般お知らせ",
    title: "",
    titleJa: "",
    message: "",
    messageJa: "",
    level: "info",
    notifyUsers: false,
    placeholders: [],
  },
];

// --- レジストリ ---

let customTemplates: AnnouncementTemplate[] = [];

/** 派生プロジェクト向け: テンプレートを追加登録 */
export function registerTemplates(templates: AnnouncementTemplate[]): void {
  customTemplates = [...customTemplates, ...templates];
}

/** 登録済み全テンプレートを取得（組み込み + カスタム） */
export function getAnnouncementTemplates(): AnnouncementTemplate[] {
  return [...BUILTIN_TEMPLATES, ...customTemplates];
}

/** カテゴリでグループ化したテンプレートを取得 */
export function getTemplatesGroupedByCategory(): Record<
  TemplateCategory,
  AnnouncementTemplate[]
> {
  const all = getAnnouncementTemplates();
  const grouped: Record<TemplateCategory, AnnouncementTemplate[]> = {
    maintenance: [],
    security: [],
    update: [],
    general: [],
  };
  for (const t of all) {
    grouped[t.category].push(t);
  }
  return grouped;
}

/** テンプレートIDからテンプレートを取得 */
export function getTemplateById(
  id: string,
): AnnouncementTemplate | undefined {
  return getAnnouncementTemplates().find((t) => t.id === id);
}

/** プレースホルダーのデフォルト値マップを生成 */
export function getDefaultPlaceholderValues(
  template: AnnouncementTemplate,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const p of template.placeholders) {
    values[p.key] = p.defaultValue ? p.defaultValue() : "";
  }
  return values;
}
