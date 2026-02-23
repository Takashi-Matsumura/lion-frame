/**
 * 組織データインポート用の型定義
 */

/**
 * インポート行（標準カラム名）
 * XLSXテンプレートのカラム名に対応
 */
export interface ImportRow {
  社員番号?: string;
  氏名?: string;
  氏名カナ?: string;
  メールアドレス?: string;
  電話番号?: string;
  本部?: string;
  部?: string;
  課?: string;
  役職?: string;
  役職コード?: string;
  入社日?: string;
  生年月日?: string;
  資格等級?: string;
  資格等級コード?: string;
  雇用区分?: string;
  雇用区分コード?: string;
}

/**
 * 処理済み社員データ
 */
export interface ProcessedEmployee {
  employeeId: string;
  name: string;
  nameKana?: string;
  email: string;
  department: string;
  section?: string;
  course?: string;
  position: string;
  positionCode?: string;
  phone?: string;
  joinDate?: Date;
  birthDate?: Date;
  qualificationGrade?: string;
  qualificationGradeCode?: string;
  employmentType?: string;
  employmentTypeCode?: string;
}

/**
 * 除外された重複社員
 */
export interface ExcludedDuplicateInfo {
  employeeId: string;
  name: string;
  position: string;
  reason: string;
  keptEmployeeId: string;
}

/**
 * プレビュー結果
 */
export interface PreviewResult {
  totalRecords: number;
  newEmployees: ProcessedEmployee[];
  updatedEmployees: {
    employee: ProcessedEmployee;
    changes: FieldChange[];
  }[];
  transferredEmployees: {
    employee: ProcessedEmployee;
    oldDepartment: string;
    newDepartment: string;
  }[];
  retiredEmployees: {
    employeeId: string;
    name: string;
    department: string;
  }[];
  excludedDuplicates: ExcludedDuplicateInfo[];
  errors: {
    row: number;
    message: string;
  }[];
}

/**
 * フィールド変更情報
 */
export interface FieldChange {
  fieldName: string;
  fieldNameJa: string;
  oldValue: string;
  newValue: string;
}
