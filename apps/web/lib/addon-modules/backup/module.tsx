/**
 * バックアップ アドオンモジュール
 *
 * コアモジュールデータのバックアップとリストアを提供。
 * 中小企業の管理者が手動で実行する想定。
 */

import { FaDatabase, FaPuzzlePiece } from "react-icons/fa";
import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule, AppTab } from "@/types/module";

const backupTabs: AppTab[] = [
  {
    id: "core",
    name: "Core",
    nameJa: "コア",
    icon: <FaDatabase className="w-5 h-5" />,
    order: 1,
    enabled: true,
  },
  {
    id: "addon",
    name: "Addon",
    nameJa: "アドオン",
    icon: <FaPuzzlePiece className="w-5 h-5" />,
    order: 2,
    enabled: true,
  },
];

export const backupModule: AppModule = {
  id: "backup",
  name: "Backup",
  nameJa: "バックアップ",
  description: "Backup and restore core module data",
  descriptionJa: "コアモジュールデータのバックアップとリストア",
  icon: getModuleIcon("backup"),
  enabled: true,
  order: 90,
  dependencies: ["system", "organization"],
  menus: [
    {
      id: "backup-admin",
      moduleId: "backup",
      name: "Backup",
      nameJa: "バックアップ",
      path: "/admin/backup",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 80,
      icon: getMenuIcon("backup-admin", "backup"),
      description: "Backup and restore data",
      descriptionJa: "データのバックアップとリストア",
      isImplemented: true,
      tabs: backupTabs,
    },
  ],
  services: [
    {
      id: "backupApi",
      moduleId: "backup",
      name: "Backup API",
      nameJa: "バックアップAPI",
      description: "Backup export, restore, and history management",
      descriptionJa: "バックアップのエクスポート・リストア・履歴管理",
      apiEndpoints: [
        "/api/backup/export",
        "/api/backup/history",
        "/api/backup/preview",
        "/api/backup/restore",
      ],
      enabled: true,
    },
  ],
};
