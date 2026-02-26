import type { AccessKey, Role } from "@prisma/client";
import type { AppMenu, AppModule } from "./module";

/**
 * Admin page user representation (from /api/admin/users)
 */
export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  createdAt: string;
  lastSignInAt: string | null;
  forcePasswordChange?: boolean;
  passwordExpiresAt?: string | null;
}

/**
 * Paginated users response
 */
export interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

/**
 * Access key with resolved target user info
 */
export type AccessKeyWithTargetUser = AccessKey & {
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  _count: {
    userAccessKeys: number;
  };
};

/**
 * Admin page tab identifiers
 */
export type AdminTabType =
  | "system"
  | "users"
  | "access-keys"
  | "modules"
  | "announcements";

/**
 * Container health status (for module management)
 */
export interface ContainerStatus {
  id: string;
  name: string;
  nameJa: string;
  required: boolean;
  description?: string;
  descriptionJa?: string;
  isRunning: boolean;
}

/**
 * MCP server information (for module management)
 */
export interface McpServerInfo {
  id: string;
  name: string;
  nameJa: string;
  description?: string;
  descriptionJa?: string;
  path: string;
  toolCount: number;
  readOnly: boolean;
  tools: Array<{
    name: string;
    descriptionJa: string;
  }>;
}

/**
 * Module information (from /api/admin/modules)
 */
export interface ModuleInfo {
  id: string;
  name: string;
  nameJa: string;
  description?: string;
  descriptionJa?: string;
  enabled: boolean;
  type: "core" | "addon";
  menuCount: number;
  menus: Array<{
    id: string;
    name: string;
    nameJa: string;
    path: string;
    menuGroup: string;
    enabled: boolean;
    order: number;
    requiredRoles: string[];
  }>;
  services: Array<{
    id: string;
    name: string;
    nameJa: string;
    description?: string;
    descriptionJa?: string;
    apiEndpoints: string[];
    enabled: boolean;
  }>;
  containers: ContainerStatus[];
  mcpServer: McpServerInfo | null;
}

/**
 * Modules response data (from /api/admin/modules)
 */
export interface ModulesData {
  modules: ModuleInfo[];
  statistics: {
    total: number;
    core: number;
    addons: number;
    enabled: number;
    disabled: number;
  };
}

/**
 * Announcement record (from /api/admin/announcements)
 */
export interface Announcement {
  id: string;
  title: string;
  titleJa: string | null;
  message: string;
  messageJa: string | null;
  level: string;
  isActive: boolean;
  startAt: string;
  endAt: string | null;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

/**
 * AI provider configuration (from /api/admin/ai)
 */
export interface AIConfig {
  enabled: boolean;
  provider: "openai" | "anthropic" | "local";
  apiKey: string | null;
  hasApiKey: boolean;
  model: string;
  localProvider: "llama.cpp" | "lm-studio" | "ollama";
  localEndpoint: string;
  localModel: string;
}

/**
 * Local LLM provider defaults
 */
export interface LocalLLMDefaults {
  [key: string]: { endpoint: string; model: string };
}

/**
 * AdminClient component props
 */
export interface AdminClientProps {
  language: "en" | "ja";
  currentUserId: string;
  accessKeys: AccessKeyWithTargetUser[];
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  }>;
  menus: AppMenu[];
  modules: AppModule[];
}

/**
 * Employee account creation candidate
 */
export interface EmployeeCandidate {
  employeeId: string;
  name: string;
  email: string | null;
  hasEmail: boolean;
  department: string;
  section: string | null;
  position: string;
  suggestedRole: string;
}

/**
 * Bulk account creation result
 */
export interface BulkCreateResult {
  created: {
    name: string;
    email: string;
    role: string;
    temporaryPassword: string;
  }[];
  skipped: number;
  errors: { employeeId: string; message: string }[];
}

/**
 * Organization option for dropdown (in candidate dialog)
 */
export interface OrganizationOption {
  id: string;
  name: string;
  departments: { id: string; name: string }[];
}

/**
 * Retired employee account info
 */
export interface RetiredAccount {
  userId: string;
  name: string;
  email: string | null;
  role: string;
  department: string;
  position: string;
}

/**
 * Announcement form state
 */
export interface AnnouncementFormState {
  title: string;
  titleJa: string;
  message: string;
  messageJa: string;
  level: string;
  startAt: string;
  endAt: string;
  notifyUsers: boolean;
}

/**
 * Admin tutorial document (full fields including extractedText)
 */
export interface AdminTutorialDocument {
  id: string;
  title: string;
  titleJa: string | null;
  description: string | null;
  descriptionJa: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  extractedText: string;
  estimatedTokens: number;
  suggestedPrompts: { text: string; textJa?: string }[];
  isEnabled: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tutorial document form state
 */
export interface TutorialDocumentFormState {
  title: string;
  titleJa: string;
  description: string;
  descriptionJa: string;
  suggestedPrompts: { text: string; textJa: string }[];
}
