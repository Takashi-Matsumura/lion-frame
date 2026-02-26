/**
 * 型定義のエントリポイント
 *
 * 使用例:
 * import type { AppModule, AppMenu, Language, AsyncState } from "@/types";
 */

// 共通型
export type {
  AsyncState,
  AsyncStatus,
  AuditableEntity,
  BaseEntity,
  DateRange,
  DateRangeString,
  FilterParams,
  FormErrors,
  KeyValuePair,
  Language,
  MenuGroupId,
  OptionalKeys,
  PaginationParams,
  PartialNullable,
  RequiredKeys,
  SelectOption,
  SoftDeletableEntity,
  SortParams,
  StatusBadgeConfig,
  StatusColor,
  TableColumn,
  Translations,
  TreeNode,
} from "./common";
// モジュール・メニュー型
export type {
  AppMenu,
  AppModule,
  MenuGroup,
  ModuleRegistry,
} from "./module";
// 管理画面型
export type {
  AccessKeyWithTargetUser,
  AdminClientProps,
  AdminTabType,
  AdminTutorialDocument,
  AdminUser,
  AIConfig,
  Announcement,
  AnnouncementFormState,
  BulkCreateResult,
  ContainerStatus,
  EmployeeCandidate,
  LocalLLMDefaults,
  McpServerInfo,
  ModuleInfo,
  ModulesData,
  OrganizationOption,
  PaginatedUsers,
  RetiredAccount,
  TutorialDocumentFormState,
} from "./admin";
// 組織型
export type {
  AutoAssignResult,
  AutoAssignSkipped,
  ManagerCandidate,
  OrgCourse,
  OrgDepartment,
  OrgEmployeeData,
  OrgManager,
  OrgSection,
  OrgSummary,
  OrganizationData,
  OrganizationStatus,
  OrganizeTabProps,
  PublishSettings,
  SelectedUnit,
  UnitType,
} from "./organization";
// AIチャット型
export type {
  AIChatClientProps,
  ChatMessage,
  TokenStats,
  TutorialDocument,
} from "./ai-chat";
