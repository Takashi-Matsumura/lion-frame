/**
 * LionFrame Module Types
 *
 * 外部アドオンモジュール開発用の共有型定義パッケージ。
 * React や Prisma に依存しないため、独立したパッケージとして利用可能。
 */

/**
 * ロール階層: GUEST → USER → MANAGER → EXECUTIVE → ADMIN
 */
export type LionFrameRole =
  | "GUEST"
  | "USER"
  | "MANAGER"
  | "EXECUTIVE"
  | "ADMIN";

/**
 * メニューグループID（サイドバーでの表示先）
 */
export type MenuGroupId =
  | "guest"
  | "user"
  | "manager"
  | "executive"
  | "admin"
  | "backoffice"
  | "developer";

/**
 * タブ定義（メニュー内のサブナビゲーション）
 */
export interface AddonTab {
  id: string;
  name: string;
  nameJa: string;
  order: number;
  enabled?: boolean;
  iconPath?: string;
  allowAccessKey?: boolean;
  description?: string;
  descriptionJa?: string;
}

/**
 * メニュー定義（サイドバーに表示される画面）
 */
export interface AddonMenu {
  id: string;
  moduleId: string;
  name: string;
  nameJa: string;
  path: string;
  menuGroup: MenuGroupId;
  requiredRoles?: LionFrameRole[];
  enabled: boolean;
  order: number;
  /** SVGパス文字列（ReactNodeではなく文字列で定義） */
  iconPath?: string;
  description?: string;
  descriptionJa?: string;
  isImplemented?: boolean;
  tabs?: AddonTab[];
  allowAccessKey?: boolean;
  requiredPermissions?: string[];
  requiredPositions?: string[];
  requiredAccessKey?: string;
  mobileEnabled?: boolean;
}

/**
 * サービス定義（画面を持たないAPI・ロジック）
 */
export interface AddonService {
  id: string;
  moduleId: string;
  name: string;
  nameJa: string;
  description?: string;
  descriptionJa?: string;
  apiEndpoints?: string[];
  enabled: boolean;
}

/**
 * 外部アドオンモジュール定義
 *
 * ReactNode を使わず、アイコンは SVG パス文字列で定義する。
 * フレームワーク側で ReactNode に変換される。
 */
export interface AddonModuleDefinition {
  id: string;
  name: string;
  nameJa: string;
  description?: string;
  descriptionJa?: string;
  /** モジュールアイコンのSVGパス文字列 */
  iconPath?: string;
  color?: string;
  enabled: boolean;
  order: number;
  dependencies?: string[];
  menus: AddonMenu[];
  services?: AddonService[];
  jaOnly?: boolean;
}
