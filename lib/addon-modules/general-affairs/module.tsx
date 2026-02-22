/**
 * 総務庶務モジュール
 *
 * 会議室・社用車・備品の予約/貸出管理を提供
 * 全社員が予約でき、バックオフィスが管理・承認する構成
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const generalAffairsModule: AppModule = {
  id: "general-affairs",
  name: "General Affairs",
  nameJa: "総務庶務",
  description: "Resource reservation management for meeting rooms, vehicles, and equipment",
  descriptionJa: "会議室・社用車・備品の予約/貸出管理",
  icon: getModuleIcon("general-affairs"),
  enabled: true,
  order: 45,
  dependencies: ["organization"],
  menus: [
    {
      id: "reservations",
      moduleId: "general-affairs",
      name: "Reservations",
      nameJa: "予約",
      path: "/reservations",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 15,
      icon: getMenuIcon("reservations", "general-affairs"),
      description: "Browse resources and make reservations",
      descriptionJa: "リソースの閲覧と予約",
      isImplemented: true,
    },
    {
      id: "assetManagement",
      moduleId: "general-affairs",
      name: "Asset Management",
      nameJa: "資産管理",
      path: "/backoffice/assets",
      menuGroup: "backoffice",
      requiredAccessKey: "backoffice",
      enabled: true,
      order: 30,
      icon: getMenuIcon("assetManagement", "general-affairs"),
      description: "Manage resource categories, resources, and reservations",
      descriptionJa: "カテゴリ・リソース・予約の管理",
      isImplemented: true,
      tabs: [
        { id: "categories", name: "Categories", nameJa: "カテゴリ", order: 1 },
        { id: "resources", name: "Resources", nameJa: "リソース", order: 2 },
        { id: "approvals", name: "Approvals", nameJa: "承認管理", order: 3 },
        { id: "stats", name: "Statistics", nameJa: "利用統計", order: 4 },
      ],
    },
  ],
  services: [
    {
      id: "reservationService",
      moduleId: "general-affairs",
      name: "Reservation Service",
      nameJa: "予約管理サービス",
      description: "Manage resource reservations and approvals",
      descriptionJa: "リソースの予約・承認を管理",
      apiEndpoints: [
        "/api/general-affairs/categories",
        "/api/general-affairs/resources",
        "/api/general-affairs/reservations",
        "/api/general-affairs/availability",
      ],
      enabled: true,
    },
  ],
};
