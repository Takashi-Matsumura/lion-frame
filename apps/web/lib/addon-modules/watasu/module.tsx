/**
 * Watasu アドオンモジュール
 *
 * スマートフォンからPCへ画像を安全に転送する機能。
 * PIN付き一時サンドボックス（10分TTL）、4層セキュリティチェック、
 * サムネイルプレビュー、一括ダウンロードを提供。
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const watasuModule: AppModule = {
  id: "watasu",
  name: "Watasu",
  nameJa: "わたす",
  description: "Securely transfer images from smartphones to PCs",
  descriptionJa: "スマートフォンからPCへ画像を安全に転送",
  icon: getModuleIcon("watasu"),
  enabled: true,
  order: 95,
  jaOnly: true,
  dependencies: ["system"],
  menus: [
    {
      id: "watasu",
      moduleId: "watasu",
      name: "Watasu",
      nameJa: "わたす",
      path: "/watasu",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      requiredAccessKey: "watasu",
      enabled: true,
      order: 55,
      icon: getMenuIcon("watasu", "watasu"),
      description: "Transfer images from smartphone to PC",
      descriptionJa: "スマートフォンからPCへ画像転送",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "watasuApi",
      moduleId: "watasu",
      name: "Watasu API",
      nameJa: "わたすAPI",
      description: "Sandbox management, file upload/download API",
      descriptionJa: "サンドボックス管理、ファイル送受信API",
      apiEndpoints: [
        "/api/watasu/sandboxes",
        "/api/watasu/sandboxes/[id]",
        "/api/watasu/join",
        "/api/watasu/upload",
        "/api/watasu/download/[fileId]",
        "/api/watasu/thumbnail/[fileId]",
      ],
      enabled: true,
    },
  ],
};
