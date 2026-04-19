import { prisma } from "@/lib/prisma";

// 監査ログのカテゴリ
// 注: "OIDC" は Issue #6 で LionFrame 本体の認証基盤拡張（OIDC Provider 機能）として
// フレームに組み込まれたカテゴリ。派生プロジェクトでは追加せず、既存カテゴリを利用する。
export type AuditCategory =
  | "AUTH"
  | "USER_MANAGEMENT"
  | "SYSTEM_SETTING"
  | "MODULE"
  | "TAG"
  | "USAGE"
  | "WORKFLOW"
  | "OIDC";

// 監査ログのアクション
export type AuditAction =
  // AUTH
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  // USER_MANAGEMENT
  | "USER_CREATE"
  | "USER_DELETE"
  | "BULK_USER_DELETE"
  | "USER_ROLE_CHANGE"
  | "PASSWORD_RESET"
  | "PASSWORD_CHANGE"
  | "WEBAUTHN_REGISTER"
  | "WEBAUTHN_AUTHENTICATE"
  | "WEBAUTHN_AUTHENTICATE_FAILURE"
  | "WEBAUTHN_TEST"
  | "WEBAUTHN_DELETE"
  | "WEBAUTHN_NICKNAME_UPDATE"
  | "WEBAUTHN_ADMIN_DELETE"
  | "PROFILE_IMAGE_UPDATE"
  | "PROFILE_IMAGE_DELETE"
  // SYSTEM_SETTING
  | "LDAP_CONFIG_CHANGE"
  | "AI_CONFIG_UPDATE"
  | "ANNOUNCEMENT_CREATE"
  | "ANNOUNCEMENT_UPDATE"
  | "ANNOUNCEMENT_DELETE"
  | "TUTORIAL_DOCUMENT_CREATE"
  | "TUTORIAL_DOCUMENT_UPDATE"
  | "TUTORIAL_DOCUMENT_DELETE"
  | "ACCESS_KEY_CREATE"
  | "ACCESS_KEY_DELETE"
  | "ACCESS_KEY_TOGGLE"
  | "ACCOUNT_CREATE_FROM_EMPLOYEE"
  | "DATA_IMPORT"
  | "DATA_IMPORT_CANCEL"
  | "DATA_CLEAR"
  | "ORGANIZATION_PUBLISH"
  | "MANAGER_ASSIGN"
  | "MANAGER_AUTO_ASSIGN"
  | "APPLY_PENDING_IMPORTS"
  | "EMPLOYEE_METADATA_UPDATE"
  | "SUPERVISOR_AUTO_ASSIGN"
  | "SYSTEM_DIAGNOSTIC"
  | "DEPENDENCY_CHECK"
  // MODULE
  | "MODULE_TOGGLE"
  | "MODULE_HEALTH_CHECK"
  | "MENU_TOGGLE"
  | "ACCESS_KEY_PERMISSION_UPDATE"
  | "AI_CHAT_MESSAGE"
  | "ORG_CONTEXT_TOGGLE"
  | "PAGE_GUIDE_EDIT"
  | "PAGE_GUIDE_REVERT"
  | "EDITOR_AI_ASSIST"
  // TAG
  | "TAG_CREATE"
  | "TAG_UPDATE"
  | "TAG_DELETE"
  | "TAG_ASSIGN"
  | "TAG_UNASSIGN"
  // USAGE
  | "PAGE_ACCESS"
  // WORKFLOW
  | "WORKFLOW_SUBMIT"
  | "WORKFLOW_APPROVE"
  | "WORKFLOW_REJECT"
  | "WORKFLOW_CANCEL"
  // BACKUP
  | "BACKUP_CREATE"
  | "BACKUP_RESTORE"
  // ADDON BACKUP
  | "NFC_CARD_BACKUP_CREATE"
  | "NFC_CARD_BACKUP_RESTORE"
  // WATASU
  | "WATASU_SANDBOX_CREATE"
  | "WATASU_SANDBOX_JOIN"
  | "WATASU_SANDBOX_CLOSE"
  | "WATASU_FILE_UPLOAD"
  | "WATASU_FILE_DOWNLOAD"
  | "WATASU_ACCESS_TOGGLE"
  // OIDC（Issue #6 でフレーム本体の認証基盤拡張として追加）
  | "OIDC_AUTHORIZE"
  | "OIDC_AUTHORIZE_DENIED"
  | "OIDC_CONSENT_GRANT"
  | "OIDC_TOKEN_ISSUE"
  | "OIDC_TOKEN_REUSE_DETECTED"
  | "OIDC_USERINFO_ACCESS"
  | "OIDC_CLIENT_CREATE"
  | "OIDC_CLIENT_UPDATE"
  | "OIDC_CLIENT_DELETE"
  | "OIDC_CLIENT_SECRET_REGENERATE"
  | "OIDC_CLEANUP";

export interface AuditLogInput {
  action: AuditAction;
  category: AuditCategory;
  userId?: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface GetLogsOptions {
  category?: AuditCategory;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  /**
   * 監査ログを記録
   */
  static async log(input: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: input.action,
          category: input.category,
          userId: input.userId,
          targetId: input.targetId,
          targetType: input.targetType,
          details: input.details ? JSON.stringify(input.details) : null,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      // 監査ログの記録失敗はメイン処理に影響させない
      console.error("[AuditService] Failed to create audit log:", error);
    }
  }

  /**
   * 監査ログを取得（ページネーション付き）
   */
  static async getLogs(options: GetLogsOptions = {}) {
    const {
      category,
      action,
      userId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = options;

    const where: {
      category?: string;
      action?: string;
      userId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (category) where.category = category;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * 古いログを削除（保持期間: デフォルト90日）
   */
  static async cleanupOldLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}
