import { ApiError, apiHandler } from "@/lib/api";
import { CORE_MODULE_IDS } from "@/lib/modules/constants";
import { moduleRegistry } from "@/lib/modules/registry";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";

export const GET = apiHandler(async () => {
  // メニュー順序、有効状態、allowAccessKey設定のオーバーライドを取得
  const menuSettings = await prisma.systemSetting.findMany({
    where: {
      OR: [
        { key: { startsWith: "menu_order_" } },
        { key: { startsWith: "menu_enabled_" } },
        { key: { startsWith: "menu_allow_access_key_" } },
        { key: { startsWith: "tab_allow_access_key_" } },
      ],
    },
  });
  const menuOrderOverrides: Record<string, number> = {};
  const menuEnabledOverrides: Record<string, boolean> = {};
  const menuAllowAccessKeyOverrides: Record<string, boolean> = {};
  const tabAllowAccessKeyOverrides: Record<string, boolean> = {};
  for (const setting of menuSettings) {
    if (setting.key.startsWith("menu_order_")) {
      const menuId = setting.key.replace("menu_order_", "");
      menuOrderOverrides[menuId] = parseInt(setting.value, 10);
    } else if (setting.key.startsWith("menu_enabled_")) {
      const menuId = setting.key.replace("menu_enabled_", "");
      menuEnabledOverrides[menuId] = setting.value === "true";
    } else if (setting.key.startsWith("menu_allow_access_key_")) {
      const menuId = setting.key.replace("menu_allow_access_key_", "");
      menuAllowAccessKeyOverrides[menuId] = setting.value === "true";
    } else if (setting.key.startsWith("tab_allow_access_key_")) {
      // tab_allow_access_key_{menuId}_{tabId} の形式
      const key = setting.key.replace("tab_allow_access_key_", "");
      tabAllowAccessKeyOverrides[key] = setting.value === "true";
    }
  }

  // モジュール有効状態のオーバーライドを取得
  const moduleEnabledSettings = await prisma.systemSetting.findMany({
    where: {
      key: {
        startsWith: "module_enabled_",
      },
    },
  });
  const moduleEnabledOverrides: Record<string, boolean> = {};
  for (const setting of moduleEnabledSettings) {
    const moduleId = setting.key.replace("module_enabled_", "");
    moduleEnabledOverrides[moduleId] = setting.value === "true";
  }

  // コンテナステータスをチェックする関数
  const checkContainerStatus = async (
    containerId: string,
    healthCheckUrl?: string,
  ): Promise<boolean> => {
    try {
      // コンテナIDに基づいて適切なヘルスチェックを実行
      switch (containerId) {
        case "postgres":
        case "postgresql": {
          // PostgreSQLはPrismaの接続チェック
          await prisma.$queryRaw`SELECT 1`;
          return true;
        }
        default: {
          // healthCheckUrlが定義されている場合はHTTPチェック
          if (healthCheckUrl) {
            const url = healthCheckUrl.startsWith("http")
              ? healthCheckUrl
              : `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${healthCheckUrl}`;
            const res = await fetch(url, {
              signal: AbortSignal.timeout(5000),
            });
            return res.ok;
          }
          // healthCheckUrlがない場合は稼働中と仮定
          return true;
        }
      }
    } catch {
      return false;
    }
  };

  // モジュール情報を取得
  // 依存関係がないモジュールをcoreとして扱う
  const modules = await Promise.all(
    Object.values(moduleRegistry).map(async (module) => {
      const isCore = CORE_MODULE_IDS.has(module.id);

      // コンテナステータスをチェック
      const containersWithStatus = module.containers
        ? await Promise.all(
            module.containers.map(async (container) => ({
              id: container.id,
              name: container.name,
              nameJa: container.nameJa,
              required: container.required,
              description: container.description,
              descriptionJa: container.descriptionJa,
              isRunning: await checkContainerStatus(container.id, container.healthCheckUrl),
            })),
          )
        : [];

      // モジュール有効状態: SystemSettingの値があればそれを使用、なければデフォルト値
      const isEnabled = moduleEnabledOverrides[module.id] ?? module.enabled;

      return {
        id: module.id,
        name: module.name,
        nameJa: module.nameJa,
        description: module.description,
        descriptionJa: module.descriptionJa,
        enabled: isEnabled,
        type: isCore ? ("core" as const) : ("addon" as const),
        jaOnly: module.jaOnly ?? false,
        dependencies: module.dependencies ?? [],
        menuCount: module.menus.filter(
          (m) => menuEnabledOverrides[m.id] ?? m.enabled,
        ).length,
        menus: module.menus.map((menu) => {
          // メニューのallowAccessKey: DB値 → モジュール定義 → デフォルトtrue
          const menuAllowAccessKeyDefault = menu.allowAccessKey ?? true;
          const menuAllowAccessKey =
            menuAllowAccessKeyOverrides[menu.id] ?? menuAllowAccessKeyDefault;

          // タブ情報を構築
          const tabs =
            menu.tabs?.map((tab) => {
              const tabKey = `${menu.id}_${tab.id}`;
              const tabAllowAccessKeyDefault = tab.allowAccessKey ?? true;
              const tabAllowAccessKey =
                tabAllowAccessKeyOverrides[tabKey] ??
                tabAllowAccessKeyDefault;
              return {
                id: tab.id,
                name: tab.name,
                nameJa: tab.nameJa,
                order: tab.order,
                enabled: tab.enabled ?? true,
                allowAccessKey: tabAllowAccessKey,
                allowAccessKeyDefault: tabAllowAccessKeyDefault,
              };
            }) || [];

          return {
            id: menu.id,
            name: menu.name,
            nameJa: menu.nameJa,
            path: menu.path,
            menuGroup: menu.menuGroup,
            enabled: menuEnabledOverrides[menu.id] ?? menu.enabled,
            order: menuOrderOverrides[menu.id] ?? menu.order,
            requiredRoles: menu.requiredRoles || [],
            allowAccessKey: menuAllowAccessKey,
            allowAccessKeyDefault: menuAllowAccessKeyDefault,
            tabs: tabs.length > 0 ? tabs : undefined,
          };
        }),
        services: (module.services || []).map((service) => ({
          id: service.id,
          name: service.name,
          nameJa: service.nameJa,
          description: service.description,
          descriptionJa: service.descriptionJa,
          apiEndpoints: service.apiEndpoints || [],
          enabled: service.enabled,
        })),
        containers: containersWithStatus,
        mcpServer: module.mcpServer
          ? {
              id: module.mcpServer.id,
              name: module.mcpServer.name,
              nameJa: module.mcpServer.nameJa,
              description: module.mcpServer.description,
              descriptionJa: module.mcpServer.descriptionJa,
              path: module.mcpServer.path,
              toolCount: module.mcpServer.toolCount,
              readOnly: module.mcpServer.readOnly,
              tools: module.mcpServer.tools,
            }
          : null,
      };
    }),
  );

  // 統計情報を計算
  const statistics = {
    total: modules.length,
    core: modules.filter((m) => m.type === "core").length,
    addons: modules.filter((m) => m.type === "addon").length,
    enabled: modules.filter((m) => m.enabled).length,
    disabled: modules.filter((m) => !m.enabled).length,
  };

  return {
    modules,
    statistics,
  };
}, { admin: true });

export const PATCH = apiHandler(async (request, session) => {
  const { moduleId, enabled } = await request.json();

  if (!moduleId || typeof enabled !== "boolean") {
    throw ApiError.badRequest("Module ID and enabled status are required");
  }

  // モジュールが存在するか確認
  const module = moduleRegistry[moduleId];
  if (!module) {
    throw ApiError.notFound("Module not found", "モジュールが見つかりません");
  }

  // コアモジュールは無効化できない
  const isCore = !module.dependencies || module.dependencies.length === 0;
  if (isCore && !enabled) {
    throw ApiError.badRequest(
      "Core modules cannot be disabled",
      "コアモジュールは無効化できません",
    );
  }

  // SystemSettingに保存
  const settingKey = `module_enabled_${moduleId}`;
  await prisma.systemSetting.upsert({
    where: { key: settingKey },
    update: { value: enabled.toString() },
    create: { key: settingKey, value: enabled.toString() },
  });

  // ランタイムのモジュールレジストリも更新（再起動まで有効）
  module.enabled = enabled;

  // 監査ログに記録
  await AuditService.log({
    action: "MODULE_TOGGLE",
    category: "MODULE",
    userId: session.user.id,
    targetId: moduleId,
    targetType: "Module",
    details: {
      moduleName: module.name,
      moduleNameJa: module.nameJa,
      enabled,
    },
  }).catch(() => {});

  // 全管理者にモジュール状態変更通知を発行
  await NotificationService.broadcast({
    role: "ADMIN",
    type: "SYSTEM",
    priority: "NORMAL",
    title: enabled ? "Module enabled" : "Module disabled",
    titleJa: enabled
      ? "モジュールが有効になりました"
      : "モジュールが無効になりました",
    message: `Module "${module.name}" has been ${enabled ? "enabled" : "disabled"}.`,
    messageJa: `モジュール「${module.nameJa || module.name}」が${enabled ? "有効" : "無効"}になりました。`,
    source: "MODULE",
  }).catch((err) => {
    console.error("[Module] Failed to create notification:", err);
  });

  return {
    success: true,
    moduleId,
    enabled,
  };
}, { admin: true });

export const POST = apiHandler(async (request, session) => {
  const { menuId, enabled } = await request.json();

  if (!menuId || typeof enabled !== "boolean") {
    throw ApiError.badRequest("Menu ID and enabled status are required");
  }

  // メニューが存在するか確認
  let menuFound = false;
  let foundModule: (typeof moduleRegistry)[string] | null = null;
  let foundMenu: { id: string; name: string; nameJa?: string } | null = null;
  for (const module of Object.values(moduleRegistry)) {
    const menu = module.menus.find((m) => m.id === menuId);
    if (menu) {
      menuFound = true;
      foundModule = module;
      foundMenu = menu;
      break;
    }
  }

  if (!menuFound || !foundModule || !foundMenu) {
    throw ApiError.notFound("Menu not found", "メニューが見つかりません");
  }

  // SystemSettingに保存
  const settingKey = `menu_enabled_${menuId}`;
  await prisma.systemSetting.upsert({
    where: { key: settingKey },
    update: { value: enabled.toString() },
    create: { key: settingKey, value: enabled.toString() },
  });

  // 監査ログに記録
  await AuditService.log({
    action: "MENU_TOGGLE",
    category: "MODULE",
    userId: session.user.id,
    targetId: menuId,
    targetType: "Menu",
    details: {
      menuName: foundMenu.name,
      menuNameJa: foundMenu.nameJa,
      moduleName: foundModule.name,
      moduleNameJa: foundModule.nameJa,
      enabled,
    },
  }).catch(() => {});

  return {
    success: true,
    menuId,
    enabled,
  };
}, { admin: true });

export const PUT = apiHandler(async (request) => {
  const { menuId, order } = await request.json();

  if (!menuId || typeof order !== "number") {
    throw ApiError.badRequest("Menu ID and order are required");
  }

  // メニューが存在するか確認
  let menuFound = false;
  for (const module of Object.values(moduleRegistry)) {
    const menu = module.menus.find((m) => m.id === menuId);
    if (menu) {
      menuFound = true;
      // ランタイムのメニュー順序も更新
      menu.order = order;
      break;
    }
  }

  if (!menuFound) {
    throw ApiError.notFound("Menu not found", "メニューが見つかりません");
  }

  // SystemSettingに保存
  const settingKey = `menu_order_${menuId}`;
  await prisma.systemSetting.upsert({
    where: { key: settingKey },
    update: { value: order.toString() },
    create: { key: settingKey, value: order.toString() },
  });

  return {
    success: true,
    menuId,
    order,
  };
}, { admin: true });
