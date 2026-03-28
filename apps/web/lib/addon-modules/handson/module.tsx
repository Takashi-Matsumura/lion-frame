/**
 * ハンズオン アドオンモジュール
 *
 * 新入社員研修・インターンシップ向けのインタラクティブ研修機能。
 * エディタで作成したマークダウン教材を使い、受講者の進捗をリアルタイムに追跡。
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const handsonModule: AppModule = {
  id: "handson",
  name: "Hands-on",
  nameJa: "ハンズオン",
  description: "Interactive training sessions for new employees and interns",
  descriptionJa: "新入社員・インターン向けのインタラクティブ研修",
  icon: getModuleIcon("handson"),
  enabled: true,
  order: 40,
  jaOnly: false,
  dependencies: ["system", "editor"],
  menus: [
    {
      id: "handson",
      moduleId: "handson",
      name: "Hands-on",
      nameJa: "ハンズオン",
      path: "/handson",
      menuGroup: "guest",
      enabled: true,
      order: 20,
      icon: getMenuIcon("handson", "handson"),
      description: "Interactive training session",
      descriptionJa: "インタラクティブ研修",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "handsonApi",
      moduleId: "handson",
      name: "Hands-on API",
      nameJa: "ハンズオンAPI",
      description: "Session management and progress tracking",
      descriptionJa: "セッション管理と進捗トラッキング",
      apiEndpoints: [
        "/api/handson/active",
        "/api/handson/sessions",
        "/api/handson/sessions/[id]",
        "/api/handson/sessions/[id]/join",
        "/api/handson/sessions/[id]/log",
        "/api/handson/sessions/[id]/progress",
        "/api/handson/sessions/[id]/document",
        "/api/handson/sessions/[id]/help",
        "/api/handson/sessions/[id]/analytics",
      ],
      enabled: true,
    },
  ],
};
