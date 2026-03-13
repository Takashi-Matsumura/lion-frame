/**
 * 外部アドオンモジュールローダー
 *
 * @lionframe/module-types の AddonModuleDefinition を
 * 内部の AppModule 型に変換してレジストリに統合する。
 */

import type { AddonModuleDefinition } from "@lionframe/module-types";
import { externalAddons as externalAddonsList } from "@/addons";
import type { AppMenu, AppModule, AppTab } from "@/types/module";
import { createIcon } from "./icons";
import { iconPaths } from "./icons";

/**
 * 外部アドオンモジュールのIDセット
 * Core / Addon / External の判定に使用する
 */
export const EXTERNAL_MODULE_IDS = new Set(
  externalAddonsList.map((addon) => addon.id),
);

/**
 * AddonModuleDefinition → AppModule に変換
 *
 * - iconPath（SVG文字列）→ ReactNode に変換
 * - AddonMenu → AppMenu に変換
 */
export function convertAddonToModule(
  addon: AddonModuleDefinition,
): AppModule {
  const moduleIcon = addon.iconPath
    ? createIcon(addon.iconPath)
    : createIcon(iconPaths.default);

  return {
    id: addon.id,
    name: addon.name,
    nameJa: addon.nameJa,
    description: addon.description,
    descriptionJa: addon.descriptionJa,
    icon: moduleIcon,
    color: addon.color,
    enabled: addon.enabled,
    order: addon.order,
    dependencies: addon.dependencies,
    jaOnly: addon.jaOnly,
    menus: addon.menus.map(
      (menu): AppMenu => ({
        id: menu.id,
        moduleId: menu.moduleId,
        name: menu.name,
        nameJa: menu.nameJa,
        path: menu.path,
        menuGroup: menu.menuGroup,
        requiredRoles: menu.requiredRoles as AppMenu["requiredRoles"],
        enabled: menu.enabled,
        order: menu.order,
        icon: menu.iconPath ? createIcon(menu.iconPath) : undefined,
        description: menu.description,
        descriptionJa: menu.descriptionJa,
        isImplemented: menu.isImplemented,
        allowAccessKey: menu.allowAccessKey,
        requiredPermissions: menu.requiredPermissions,
        requiredPositions: menu.requiredPositions,
        requiredAccessKey: menu.requiredAccessKey,
        mobileEnabled: menu.mobileEnabled,
        tabs: menu.tabs?.map(
          (tab): AppTab => ({
            id: tab.id,
            name: tab.name,
            nameJa: tab.nameJa,
            order: tab.order,
            enabled: tab.enabled,
            icon: tab.iconPath ? createIcon(tab.iconPath) : undefined,
            allowAccessKey: tab.allowAccessKey,
            description: tab.description,
            descriptionJa: tab.descriptionJa,
          }),
        ),
      }),
    ),
    services: addon.services?.map((service) => ({
      id: service.id,
      moduleId: service.moduleId,
      name: service.name,
      nameJa: service.nameJa,
      description: service.description,
      descriptionJa: service.descriptionJa,
      apiEndpoints: service.apiEndpoints,
      enabled: service.enabled,
    })),
  };
}

/**
 * 外部アドオン設定ファイルから読み込んだモジュール定義を変換
 */
export function loadExternalAddons(
  addonDefinitions: AddonModuleDefinition[],
): AppModule[] {
  return addonDefinitions.map(convertAddonToModule);
}
