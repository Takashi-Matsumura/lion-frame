/**
 * エディタ アドオンモジュール
 *
 * マークダウンエディタなど、業務で使える各種エディタを提供。
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const editorModule: AppModule = {
  id: "editor",
  name: "Editor",
  nameJa: "エディタ",
  description: "Markdown editor and other productivity tools",
  descriptionJa: "マークダウンエディタなど業務で使えるツール",
  icon: getModuleIcon("editor"),
  enabled: true,
  order: 28,
  jaOnly: true,
  dependencies: ["system"],
  menus: [
    {
      id: "editor",
      moduleId: "editor",
      name: "Editor",
      nameJa: "エディタ",
      path: "/editor",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 28,
      icon: getMenuIcon("editor", "editor"),
      description: "Markdown editor and tools",
      descriptionJa: "マークダウンエディタ",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "editorApi",
      moduleId: "editor",
      name: "Editor API",
      nameJa: "エディタAPI",
      description: "Document CRUD operations",
      descriptionJa: "ドキュメントのCRUD操作",
      apiEndpoints: ["/api/editor", "/api/editor/[id]"],
      enabled: true,
    },
  ],
};
