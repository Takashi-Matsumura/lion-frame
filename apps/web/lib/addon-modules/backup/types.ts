/**
 * バックアップモジュール 型定義
 */

/** バックアップファイルのマニフェスト */
export interface BackupManifest {
  version: "1.0";
  framework: "LionFrame";
  createdAt: string;
  createdBy: string;
  models: Record<string, number>;
}

/** User のバックアップ用型（機密情報除外） */
export interface UserBackup {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: string;
  language: string;
  timezone: string;
  systemPrompt: string | null;
  orgContextEnabled: boolean;
  lastSignInAt: Date | null;
  forcePasswordChange: boolean;
  passwordExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** バックアップファイル全体の構造 */
export interface BackupFile {
  manifest: BackupManifest;
  data: {
    systemSettings: Array<Record<string, unknown>>;
    positionMasters: Array<Record<string, unknown>>;
    organizations: Array<Record<string, unknown>>;
    departments: Array<Record<string, unknown>>;
    sections: Array<Record<string, unknown>>;
    courses: Array<Record<string, unknown>>;
    employees: Array<Record<string, unknown>>;
    employeeHistories: Array<Record<string, unknown>>;
    organizationHistories: Array<Record<string, unknown>>;
    changeLogs: Array<Record<string, unknown>>;
    managerHistories: Array<Record<string, unknown>>;
    users: UserBackup[];
    permissions: Array<Record<string, unknown>>;
    accessKeys: Array<Record<string, unknown>>;
    accessKeyPermissions: Array<Record<string, unknown>>;
    userAccessKeys: Array<Record<string, unknown>>;
  };
}

/** バックアップ履歴のメタデータ */
export interface BackupHistoryEntry {
  id: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  modelCounts: Record<string, number>;
  totalRecords: number;
  sizeBytes: number;
}

/** リストアプレビューの行 */
export interface RestorePreviewRow {
  model: string;
  modelJa: string;
  current: number;
  backup: number;
}

/** バックアップ対象モデル名のマッピング */
export const MODEL_NAMES: Record<string, string> = {
  systemSettings: "システム設定",
  positionMasters: "役職マスタ",
  organizations: "組織",
  departments: "本部",
  sections: "部",
  courses: "課",
  employees: "社員",
  employeeHistories: "社員履歴",
  organizationHistories: "組織履歴",
  changeLogs: "変更ログ",
  managerHistories: "責任者履歴",
  users: "ユーザー",
  permissions: "権限",
  accessKeys: "アクセスキー",
  accessKeyPermissions: "アクセスキー権限",
  userAccessKeys: "ユーザーアクセスキー",
};

/** バックアップ対象モデル名（英語） */
export const MODEL_NAMES_EN: Record<string, string> = {
  systemSettings: "System Settings",
  positionMasters: "Position Master",
  organizations: "Organizations",
  departments: "Departments",
  sections: "Sections",
  courses: "Courses",
  employees: "Employees",
  employeeHistories: "Employee History",
  organizationHistories: "Organization History",
  changeLogs: "Change Logs",
  managerHistories: "Manager History",
  users: "Users",
  permissions: "Permissions",
  accessKeys: "Access Keys",
  accessKeyPermissions: "Access Key Permissions",
  userAccessKeys: "User Access Keys",
};
