/**
 * 社員健康管理 アドオンモジュール
 *
 * 健康診断キャンペーンの管理、フォーム回答データのインポート、
 * 社員の予約・受診状況トラッキングを提供するアドオンモジュール。
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const healthCheckupModule: AppModule = {
  id: "health-checkup",
  name: "Health Checkup",
  nameJa: "健康管理",
  description: "Employee health checkup booking and tracking",
  descriptionJa: "社員健康診断の予約・受診状況管理",
  icon: getModuleIcon("health-checkup"),
  enabled: true,
  order: 35,
  jaOnly: true,
  dependencies: ["system", "organization"],
  menus: [
    {
      id: "health-checkup",
      moduleId: "health-checkup",
      name: "Health Checkup",
      nameJa: "健康管理",
      path: "/health-checkup",
      menuGroup: "backoffice",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      requiredAccessKey: "health_checkup",
      enabled: true,
      order: 20,
      icon: getMenuIcon("health-checkup", "health-checkup"),
      description: "Health checkup booking management",
      descriptionJa: "健康診断の予約・受診状況管理",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "healthCheckupApi",
      moduleId: "health-checkup",
      name: "Health Checkup API",
      nameJa: "健康管理API",
      description: "Health checkup campaign and record management",
      descriptionJa: "健康診断キャンペーンとレコードの管理",
      apiEndpoints: [
        "/api/health-checkup",
        "/api/health-checkup/[id]",
        "/api/health-checkup/[id]/import",
        "/api/health-checkup/[id]/records",
      ],
      enabled: true,
    },
  ],
};
