import { prisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";
import { NotificationService } from "./notification-service";

interface PermissionInput {
  granularity: "module" | "menu" | "tab";
  moduleId?: string;
  menuPath?: string;
  tabId?: string;
}

interface CreateAccessKeyParams {
  name: string;
  expiresAt: string;
  targetUserId: string;
  menuPaths: string[];
  permissions?: PermissionInput[];
  createdBy: string;
}

/**
 * Access key service.
 * Extracts key generation and permission management logic from the API route.
 */
export class AccessKeyService {
  /**
   * Generate a random access key string (4 segments of 8 chars, dash-separated).
   */
  static generateKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segments = 4;
    const segmentLength = 8;

    return Array.from({ length: segments }, () =>
      Array.from(
        { length: segmentLength },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join(""),
    ).join("-");
  }

  /**
   * Create a new access key with permissions in a transaction.
   */
  static async create(params: CreateAccessKeyParams) {
    const { name, expiresAt, targetUserId, menuPaths, permissions, createdBy } =
      params;

    const key = AccessKeyService.generateKey();
    const expiryDate = new Date(expiresAt);

    const accessKey = await prisma.$transaction(async (tx) => {
      const createdKey = await tx.accessKey.create({
        data: {
          key,
          name,
          targetUserId,
          menuPaths: JSON.stringify(menuPaths),
          expiresAt: expiryDate,
          isActive: true,
          createdBy,
        },
      });

      if (permissions && permissions.length > 0) {
        await tx.accessKeyPermission.createMany({
          data: permissions.map((p) => ({
            accessKeyId: createdKey.id,
            granularity: p.granularity,
            moduleId: p.moduleId,
            menuPath: p.menuPath,
            tabId: p.tabId,
          })),
        });
      }

      return tx.accessKey.findUnique({
        where: { id: createdKey.id },
        include: {
          targetUser: {
            select: { id: true, name: true, email: true },
          },
          permissions: true,
        },
      });
    });

    // Notify target user
    await NotificationService.securityNotify(targetUserId, {
      title: "New access key created",
      titleJa: "新しいアクセスキーが作成されました",
      message: `An access key "${name}" has been created for your account.`,
      messageJa: `アカウントにアクセスキー「${name}」が作成されました。`,
    }).catch((err) => {
      console.error("[AccessKey] Failed to create notification:", err);
    });

    await AuditService.log({
      action: "ACCESS_KEY_CREATE",
      category: "SYSTEM_SETTING",
      userId: createdBy,
      targetId: accessKey?.id,
      targetType: "AccessKey",
      details: { name, targetUserId },
    });

    return accessKey;
  }

  /**
   * Toggle access key active status.
   */
  static async toggle(id: string, isActive: boolean, userId: string) {
    const accessKey = await prisma.accessKey.update({
      where: { id },
      data: { isActive },
      include: {
        targetUser: { select: { id: true } },
      },
    });

    if (accessKey.targetUser) {
      await NotificationService.securityNotify(accessKey.targetUser.id, {
        title: isActive ? "Access key activated" : "Access key deactivated",
        titleJa: isActive
          ? "アクセスキーが有効になりました"
          : "アクセスキーが無効になりました",
        message: `Your access key "${accessKey.name}" has been ${isActive ? "activated" : "deactivated"}.`,
        messageJa: `アクセスキー「${accessKey.name}」が${isActive ? "有効" : "無効"}になりました。`,
      }).catch((err) => {
        console.error("[AccessKey] Failed to create notification:", err);
      });
    }

    await AuditService.log({
      action: "ACCESS_KEY_TOGGLE",
      category: "SYSTEM_SETTING",
      userId,
      targetId: id,
      targetType: "AccessKey",
      details: { name: accessKey.name, isActive },
    });

    return accessKey;
  }

  /**
   * Delete an access key.
   */
  static async delete(id: string, userId: string) {
    const accessKey = await prisma.accessKey.findUnique({
      where: { id },
      include: {
        targetUser: { select: { id: true } },
      },
    });

    await prisma.accessKey.delete({ where: { id } });

    if (accessKey?.targetUser) {
      await NotificationService.securityNotify(accessKey.targetUser.id, {
        title: "Access key deleted",
        titleJa: "アクセスキーが削除されました",
        message: `Your access key "${accessKey.name}" has been deleted.`,
        messageJa: `アクセスキー「${accessKey.name}」が削除されました。`,
      }).catch((err) => {
        console.error("[AccessKey] Failed to create notification:", err);
      });
    }

    await AuditService.log({
      action: "ACCESS_KEY_DELETE",
      category: "SYSTEM_SETTING",
      userId,
      targetId: id,
      targetType: "AccessKey",
      details: { name: accessKey?.name },
    });

    return { success: true };
  }
}
