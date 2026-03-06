/**
 * フォーム アドオンモジュール
 *
 * 柔軟なフォーム作成と回答管理を提供するアドオンモジュール。
 * 条件ロジック、組織統合フィールド対応。
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const formsModule: AppModule = {
  id: "forms",
  name: "Forms",
  nameJa: "フォーム",
  description: "Flexible form creation and response management",
  descriptionJa: "柔軟なフォーム作成と回答管理",
  icon: getModuleIcon("forms"),
  enabled: true,
  order: 30,
  dependencies: ["system", "organization"],
  menus: [
    {
      id: "forms",
      moduleId: "forms",
      name: "Forms",
      nameJa: "フォーム",
      path: "/forms",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 25,
      icon: getMenuIcon("forms", "forms"),
      description: "View and respond to published forms",
      descriptionJa: "公開フォームの閲覧と回答",
      isImplemented: true,
    },
    {
      id: "form-builder",
      moduleId: "forms",
      name: "Form Builder",
      nameJa: "フォーム作成",
      path: "/form-builder",
      menuGroup: "manager",
      requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 15,
      icon: getMenuIcon("form-builder", "forms"),
      description: "Create and manage forms",
      descriptionJa: "フォームの作成と管理",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "formsApi",
      moduleId: "forms",
      name: "Forms API",
      nameJa: "フォームAPI",
      description: "CRUD operations for forms and submissions",
      descriptionJa: "フォームと回答のCRUD操作",
      apiEndpoints: [
        "/api/forms",
        "/api/forms/[id]",
        "/api/forms/[id]/submit",
        "/api/forms/[id]/responses",
      ],
      enabled: true,
    },
  ],
};
