/**
 * 組織データインポート: カラム定義
 *
 * 標準カラム名の定義とテンプレート生成用メタデータ。
 */

/** 標準カラム名 */
export const STANDARD_COLUMNS = {
  employeeId: "社員番号",
  name: "氏名",
  nameKana: "氏名カナ",
  email: "メールアドレス",
  phone: "電話番号",
  department: "本部",
  section: "部",
  course: "課",
  position: "役職",
  positionCode: "役職コード",
  joinDate: "入社日",
  birthDate: "生年月日",
  qualificationGrade: "資格等級",
  qualificationGradeCode: "資格等級コード",
  employmentType: "雇用区分",
  employmentTypeCode: "雇用区分コード",
} as const;

/** 必須カラム */
export const REQUIRED_COLUMNS = [
  STANDARD_COLUMNS.employeeId,
  STANDARD_COLUMNS.name,
] as const;

/** 全標準カラム名のSet */
export const STANDARD_COLUMN_SET: Set<string> = new Set(
  Object.values(STANDARD_COLUMNS),
);

/**
 * カラム名エイリアス（旧フォーマット → 標準カラム名）
 *
 * OCC社フォーマットなど既存のExcelファイルとの後方互換のため、
 * 旧カラム名を標準カラム名にマッピングする。
 */
export const COLUMN_ALIASES: Record<string, string> = {
  "氏名(フリガナ)": "氏名カナ",
  "氏名（フリガナ）": "氏名カナ",
  フリガナ: "氏名カナ",
  "社用e-Mail１": "メールアドレス",
  メール: "メールアドレス",
  email: "メールアドレス",
  入社年月日: "入社日",
  セクション: "部",
  コース: "課",
};

/**
 * 「所属」カラムを検出するためのキー。
 * 所属カラムは空白区切りで 本部/部/課 に分割される特殊扱い。
 */
const AFFILIATION_COLUMN = "所属";

/**
 * ヘッダー行のエイリアスを解決し、標準カラム名に変換する。
 *
 * @param rawHeaders - XLSXから読み取った生のヘッダー名配列
 * @returns 解決済みヘッダー名配列（標準名に変換済み）と、所属カラムの有無
 */
export function resolveColumnHeaders(rawHeaders: string[]): {
  resolved: string[];
  hasAffiliation: boolean;
} {
  let hasAffiliation = false;

  const resolved = rawHeaders.map((h) => {
    const trimmed = h.trim();
    if (trimmed === AFFILIATION_COLUMN) {
      hasAffiliation = true;
      return AFFILIATION_COLUMN; // 特殊扱い（normalizeRowで分割）
    }
    if (STANDARD_COLUMN_SET.has(trimmed)) return trimmed;
    if (COLUMN_ALIASES[trimmed]) return COLUMN_ALIASES[trimmed];
    return trimmed; // 不明カラムはそのまま返す
  });

  return { resolved, hasAffiliation };
}

/**
 * 行データを標準カラム名で正規化する。
 * 「所属」カラムが存在する場合は空白区切りで本部/部/課に分割する。
 *
 * @param row - resolveColumnHeaders済みのヘッダーで構成された行データ
 * @param hasAffiliation - 所属カラムが存在するか
 * @returns 標準カラム名に正規化された行データ
 */
export function normalizeRow(
  row: Record<string, string>,
  hasAffiliation: boolean,
): Record<string, string> {
  if (!hasAffiliation || !row[AFFILIATION_COLUMN]) return row;

  // 所属文字列を空白（全角・半角）で分割
  const parts = row[AFFILIATION_COLUMN].trim().split(/[\s　]+/);
  const normalized = { ...row };

  if (parts[0] && !normalized.本部) normalized.本部 = parts[0];
  if (parts[1] && !normalized.部) normalized.部 = parts[1];
  if (parts[2] && !normalized.課) normalized.課 = parts[2];

  delete normalized[AFFILIATION_COLUMN];
  return normalized;
}

/**
 * ヘッダー行を検証し、必須カラムの存在を確認する。
 * @returns 不足している必須カラム名の配列（空なら検証OK）
 */
export function validateHeaders(headers: string[]): string[] {
  return REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
}

/** テンプレート用カラム定義 */
export interface TemplateColumn {
  name: string;
  description: string;
  descriptionJa: string;
  example: string;
  required: boolean;
  width: number;
}

/** テンプレートXLSX生成用のカラム定義 */
export const TEMPLATE_COLUMNS: TemplateColumn[] = [
  {
    name: "社員番号",
    description: "Employee ID (unique)",
    descriptionJa: "社員を一意に識別するID（必須）",
    example: "EMP001",
    required: true,
    width: 14,
  },
  {
    name: "氏名",
    description: "Full name",
    descriptionJa: "氏名（必須）",
    example: "山田 太郎",
    required: true,
    width: 16,
  },
  {
    name: "氏名カナ",
    description: "Name in katakana",
    descriptionJa: "氏名のカタカナ表記",
    example: "ヤマダ タロウ",
    required: false,
    width: 18,
  },
  {
    name: "メールアドレス",
    description: "Email address",
    descriptionJa: "メールアドレス",
    example: "taro@example.com",
    required: false,
    width: 24,
  },
  {
    name: "電話番号",
    description: "Phone number",
    descriptionJa: "電話番号",
    example: "03-1234-5678",
    required: false,
    width: 16,
  },
  {
    name: "本部",
    description: "Department (level 1)",
    descriptionJa: "組織の最上位レベル",
    example: "営業本部",
    required: false,
    width: 18,
  },
  {
    name: "部",
    description: "Section (level 2)",
    descriptionJa: "組織の中間レベル",
    example: "第一営業部",
    required: false,
    width: 18,
  },
  {
    name: "課",
    description: "Course/Team (level 3)",
    descriptionJa: "組織の最下位レベル",
    example: "企画課",
    required: false,
    width: 16,
  },
  {
    name: "役職",
    description: "Position title",
    descriptionJa: "役職名",
    example: "課長",
    required: false,
    width: 14,
  },
  {
    name: "役職コード",
    description: "Position code",
    descriptionJa: "役職コード",
    example: "300",
    required: false,
    width: 12,
  },
  {
    name: "入社日",
    description: "Join date (YYYY/MM/DD)",
    descriptionJa: "入社日（YYYY/MM/DD形式）",
    example: "2020/04/01",
    required: false,
    width: 14,
  },
  {
    name: "生年月日",
    description: "Birth date (YYYY/MM/DD)",
    descriptionJa: "生年月日（YYYY/MM/DD形式）",
    example: "1990/01/15",
    required: false,
    width: 14,
  },
  {
    name: "資格等級",
    description: "Qualification grade",
    descriptionJa: "資格等級名",
    example: "エンジニア3級",
    required: false,
    width: 18,
  },
  {
    name: "資格等級コード",
    description: "Qualification grade code",
    descriptionJa: "資格等級コード",
    example: "E3",
    required: false,
    width: 14,
  },
  {
    name: "雇用区分",
    description: "Employment type",
    descriptionJa: "雇用区分名",
    example: "正社員",
    required: false,
    width: 14,
  },
  {
    name: "雇用区分コード",
    description: "Employment type code",
    descriptionJa: "雇用区分コード",
    example: "04",
    required: false,
    width: 14,
  },
];
