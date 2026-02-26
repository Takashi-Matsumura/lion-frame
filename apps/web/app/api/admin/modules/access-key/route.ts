import { ApiError, apiHandler } from "@/lib/api";
import { moduleRegistry } from "@/lib/modules/registry";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * allowAccessKey設定を更新するAPI
 *
 * メニューレベル: { type: "menu", menuId: string, allowAccessKey: boolean }
 * タブレベル: { type: "tab", menuId: string, tabId: string, allowAccessKey: boolean }
 */
export const PATCH = apiHandler(async (request, session) => {
  const body = await request.json();
  const { type, menuId, tabId, allowAccessKey } = body;

  // バリデーション
  if (!type || !menuId || typeof allowAccessKey !== "boolean") {
    throw ApiError.badRequest(
      "type, menuId, and allowAccessKey are required",
    );
  }

  if (type !== "menu" && type !== "tab") {
    throw ApiError.badRequest("type must be 'menu' or 'tab'");
  }

  if (type === "tab" && !tabId) {
    throw ApiError.badRequest("tabId is required for tab type");
  }

  // メニューの存在確認
  let foundModule: (typeof moduleRegistry)[string] | null = null;
  let foundMenu: {
    id: string;
    name: string;
    nameJa?: string;
    tabs?: unknown[];
  } | null = null;
  let foundTab: { id: string; name: string; nameJa?: string } | null = null;

  for (const module of Object.values(moduleRegistry)) {
    const menu = module.menus.find((m) => m.id === menuId);
    if (menu) {
      foundModule = module;
      foundMenu = menu;
      if (type === "tab" && menu.tabs) {
        const tab = menu.tabs.find((t) => t.id === tabId);
        if (tab) {
          foundTab = tab;
        }
      }
      break;
    }
  }

  if (!foundMenu || !foundModule) {
    throw ApiError.notFound("Menu not found", "メニューが見つかりません");
  }

  if (type === "tab" && !foundTab) {
    throw ApiError.notFound("Tab not found", "タブが見つかりません");
  }

  // SystemSettingに保存
  let settingKey: string;
  if (type === "menu") {
    settingKey = `menu_allow_access_key_${menuId}`;
  } else {
    settingKey = `tab_allow_access_key_${menuId}_${tabId}`;
  }

  await prisma.systemSetting.upsert({
    where: { key: settingKey },
    update: { value: allowAccessKey.toString() },
    create: { key: settingKey, value: allowAccessKey.toString() },
  });

  // 監査ログに記録
  await AuditService.log({
    action: "ACCESS_KEY_PERMISSION_UPDATE",
    category: "MODULE",
    userId: session.user.id,
    targetId: type === "menu" ? menuId : `${menuId}/${tabId}`,
    targetType: type === "menu" ? "Menu" : "Tab",
    details: {
      type,
      menuId,
      menuName: foundMenu.name,
      menuNameJa: foundMenu.nameJa,
      ...(type === "tab" && {
        tabId,
        tabName: foundTab?.name,
        tabNameJa: foundTab?.nameJa,
      }),
      allowAccessKey,
    },
  }).catch(() => {});

  return {
    success: true,
    type,
    menuId,
    ...(type === "tab" && { tabId }),
    allowAccessKey,
  };
}, { admin: true });

/**
 * allowAccessKey設定をデフォルトにリセットするAPI
 */
export const DELETE = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const menuId = searchParams.get("menuId");
  const tabId = searchParams.get("tabId");

  if (!type || !menuId) {
    throw ApiError.badRequest("type and menuId are required");
  }

  if (type === "tab" && !tabId) {
    throw ApiError.badRequest("tabId is required for tab type");
  }

  // SystemSettingから削除（デフォルト値にリセット）
  let settingKey: string;
  if (type === "menu") {
    settingKey = `menu_allow_access_key_${menuId}`;
  } else {
    settingKey = `tab_allow_access_key_${menuId}_${tabId}`;
  }

  await prisma.systemSetting.deleteMany({
    where: { key: settingKey },
  });

  return {
    success: true,
    type,
    menuId,
    ...(type === "tab" && { tabId }),
    reset: true,
  };
}, { admin: true });
