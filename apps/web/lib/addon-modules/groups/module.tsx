/**
 * グループ アドオンモジュール
 *
 * 公式グループ（委員会・タスクフォース等）と個人グループの管理を提供するアドオンモジュール。
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const groupsModule: AppModule = {
  id: "groups",
  name: "Groups",
  nameJa: "グループ",
  description: "Manage official and personal groups",
  descriptionJa: "公式グループ・個人グループの管理",
  icon: getModuleIcon("groups"),
  enabled: true,
  order: 22,
  dependencies: ["organization"],
  menus: [
    {
      id: "groups",
      moduleId: "groups",
      name: "Groups",
      nameJa: "グループ",
      path: "/groups",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 12,
      icon: getMenuIcon("groups", "groups"),
      description: "View and manage official and personal groups",
      descriptionJa: "公式グループ・個人グループの閲覧と管理",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "groupsApi",
      moduleId: "groups",
      name: "Groups API",
      nameJa: "グループAPI",
      description: "CRUD operations for groups and members",
      descriptionJa: "グループとメンバーのCRUD操作",
      apiEndpoints: [
        "/api/groups",
        "/api/groups/[id]",
        "/api/groups/[id]/members",
      ],
      enabled: true,
    },
  ],
};
