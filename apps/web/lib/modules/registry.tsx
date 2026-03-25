// コアモジュール（静的インポート）
import { aiModule } from "@/lib/core-modules/ai";
import { organizationModule } from "@/lib/core-modules/organization";
import { scheduleModule } from "@/lib/core-modules/schedule";
import { systemModule } from "@/lib/core-modules/system";
// アドオンモジュール（内部）
import { formsModule } from "@/lib/addon-modules/forms";
import { nfcCardModule } from "@/lib/addon-modules/nfc-card";
import { editorModule } from "@/lib/addon-modules/editor";
import { pdfModule } from "@/lib/addon-modules/pdf";
import { healthCheckupModule } from "@/lib/addon-modules/health-checkup";
import { workflowModule } from "@/lib/addon-modules/workflow";
// キオスクモジュール
import { eventAttendanceModule } from "@/lib/kiosk-modules/event-attendance";
// 外部アドオンモジュール
import { externalAddons } from "@/addons";
import { loadExternalAddons } from "@/lib/modules/addon-loader";
import { prisma } from "@/lib/prisma";
import type {
  AppMenu,
  AppModule,
  AppTab,
  MenuGroup,
  ModuleRegistry,
} from "@/types/module";

/**
 * メニューグループの定義
 * サイドバーでの表示グループ
 * ロール階層に対応: GUEST → USER → MANAGER → EXECUTIVE → ADMIN
 */
export const menuGroups: Record<string, MenuGroup> = {
  guest: {
    id: "guest",
    name: "GUEST",
    nameJa: "ゲスト",
    color: "text-gray-600",
    order: 1,
  },
  user: {
    id: "user",
    name: "USER",
    nameJa: "ユーザ",
    color: "text-cyan-700",
    order: 2,
  },
  manager: {
    id: "manager",
    name: "MANAGER",
    nameJa: "マネージャー",
    color: "text-green-700",
    order: 3,
  },
  executive: {
    id: "executive",
    name: "EXECUTIVE",
    nameJa: "エグゼクティブ",
    color: "text-rose-700",
    order: 4,
  },
  backoffice: {
    id: "backoffice",
    name: "BACKOFFICE",
    nameJa: "バックオフィス",
    color: "text-amber-700",
    order: 5,
  },
  admin: {
    id: "admin",
    name: "ADMIN",
    nameJa: "管理者",
    color: "text-purple-700",
    order: 6,
  },
  developer: {
    id: "developer",
    name: "DEVELOPER",
    nameJa: "デベロッパー",
    color: "text-orange-600",
    order: 99,
  },
};

/**
 * 全モジュールを取得
 * moduleRegistryから有効なモジュールを動的に取得
 * メニュー順序と有効状態のオーバーライドをデータベースから適用
 */
export async function getAllModules(): Promise<AppModule[]> {
  // モジュール有効状態・メニュー順序・メニュー有効状態のオーバーライドを取得
  const settings = await prisma.systemSetting.findMany({
    where: {
      OR: [
        { key: { startsWith: "module_enabled_" } },
        { key: { startsWith: "menu_order_" } },
        { key: { startsWith: "menu_enabled_" } },
      ],
    },
  });
  const moduleEnabledOverrides: Record<string, boolean> = {};
  const menuOrderOverrides: Record<string, number> = {};
  const menuEnabledOverrides: Record<string, boolean> = {};
  for (const setting of settings) {
    if (setting.key.startsWith("module_enabled_")) {
      const moduleId = setting.key.replace("module_enabled_", "");
      moduleEnabledOverrides[moduleId] = setting.value === "true";
    } else if (setting.key.startsWith("menu_order_")) {
      const menuId = setting.key.replace("menu_order_", "");
      menuOrderOverrides[menuId] = parseInt(setting.value, 10);
    } else if (setting.key.startsWith("menu_enabled_")) {
      const menuId = setting.key.replace("menu_enabled_", "");
      menuEnabledOverrides[menuId] = setting.value === "true";
    }
  }

  return Object.values(moduleRegistry)
    .filter((module) => moduleEnabledOverrides[module.id] ?? module.enabled)
    .map((module) => ({
      ...module,
      menus: module.menus.map((menu) => ({
        ...menu,
        order: menuOrderOverrides[menu.id] ?? menu.order,
        enabled: menuEnabledOverrides[menu.id] ?? menu.enabled,
      })),
    }));
}

/**
 * モジュールレジストリ
 *
 * 内部モジュール: ここに直接登録
 * 外部アドオン: addons.ts に登録 → 自動的にレジストリに統合
 */
export const moduleRegistry: ModuleRegistry = {
  // コアモジュール
  ai: aiModule,
  system: systemModule,
  organization: organizationModule,
  schedule: scheduleModule,
  // アドオンモジュール（内部）
  forms: formsModule,
  workflow: workflowModule,
  editor: editorModule,
  "health-checkup": healthCheckupModule,
  "nfc-card": nfcCardModule,
  pdf: pdfModule,
  // キオスクモジュール
  "event-attendance": eventAttendanceModule,
  // 外部アドオンモジュール（addons.ts から自動登録）
  ...Object.fromEntries(
    loadExternalAddons(externalAddons).map((m) => [m.id, m]),
  ),
};

/**
 * 有効なモジュールを取得
 */
export function getEnabledModules(): AppModule[] {
  return Object.values(moduleRegistry).filter((module) => module.enabled);
}

/**
 * IDでモジュールを取得
 */
export function getModuleById(id: string): AppModule | undefined {
  return moduleRegistry[id];
}

/**
 * 全メニューをフラットな配列で取得
 * サイドバー表示用
 * メニューにアイコンが指定されていない場合、モジュールのアイコンを継承
 */
export function getAllMenus(): AppMenu[] {
  return Object.values(moduleRegistry)
    .filter((module) => module.enabled)
    .flatMap((module) =>
      module.menus
        .filter((menu) => menu.enabled)
        .map((menu) => ({
          ...menu,
          icon: menu.icon || module.icon,
        })),
    );
}

/**
 * メニューグループごとにメニューを取得
 */
export function getMenusByGroup(groupId: string): AppMenu[] {
  return getAllMenus()
    .filter((menu) => menu.menuGroup === groupId)
    .sort((a, b) => a.order - b.order);
}

/**
 * モジュールIDからメニュー一覧を取得
 */
export function getMenusByModuleId(moduleId: string): AppMenu[] {
  const module = moduleRegistry[moduleId];
  return module ? module.menus.filter((menu) => menu.enabled) : [];
}

/**
 * メニューIDからメニューを取得
 */
export function getMenuById(menuId: string): AppMenu | undefined {
  for (const module of Object.values(moduleRegistry)) {
    const menu = module.menus.find((m) => m.id === menuId);
    if (menu) return menu;
  }
  return undefined;
}

/**
 * パスからメニューを取得
 */
export function getMenuByPath(path: string): AppMenu | undefined {
  // 完全一致
  for (const module of Object.values(moduleRegistry)) {
    const menu = module.menus.find((m) => m.path === path);
    if (menu) return menu;
  }
  // 前方一致（動的ルート: /forms/[id] → /forms）
  for (const module of Object.values(moduleRegistry)) {
    const menu = module.menus.find(
      (m) => m.path !== "/" && path.startsWith(m.path + "/"),
    );
    if (menu) return menu;
  }
  return undefined;
}

/**
 * モジュール統計情報を取得
 */
export async function getModuleStats() {
  const modules = await getAllModules();
  const allMenus = modules.flatMap((module) =>
    module.menus
      .filter((menu) => menu.enabled)
      .map((menu) => ({
        ...menu,
        icon: menu.icon || module.icon,
      })),
  );

  return {
    totalModules: modules.length,
    totalMenus: allMenus.length,
    menusByGroup: Object.keys(menuGroups).reduce(
      (acc, groupId) => {
        acc[groupId] = allMenus.filter((m) => m.menuGroup === groupId).length;
        return acc;
      },
      {} as Record<string, number>,
    ),
    menusByModule: modules.reduce(
      (acc, module) => {
        acc[module.id] = module.menus.filter((m) => m.enabled).length;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };
}

/**
 * パスからメニューのタブ定義を取得
 * @param path メニューパス（例: "/admin"）
 * @returns タブ定義の配列、タブがない場合はundefined
 */
export function getTabsByMenuPath(path: string): AppTab[] | undefined {
  const menu = getMenuByPath(path);
  if (!menu?.tabs || menu.tabs.length === 0) {
    return undefined;
  }
  // order順でソートして返す
  return [...menu.tabs]
    .filter((tab) => tab.enabled !== false)
    .sort((a, b) => a.order - b.order);
}

/**
 * メニューIDからタブ定義を取得
 * @param menuId メニューID（例: "adminPanel"）
 * @returns タブ定義の配列、タブがない場合はundefined
 */
export function getTabsByMenuId(menuId: string): AppTab[] | undefined {
  const menu = getMenuById(menuId);
  if (!menu?.tabs || menu.tabs.length === 0) {
    return undefined;
  }
  // order順でソートして返す
  return [...menu.tabs]
    .filter((tab) => tab.enabled !== false)
    .sort((a, b) => a.order - b.order);
}
