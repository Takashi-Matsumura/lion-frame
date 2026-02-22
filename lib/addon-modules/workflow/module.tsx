/**
 * ワークフローモジュール
 *
 * 汎用ワークフローエンジン（申請・承認）
 * Phase 1: 休暇申請
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const workflowModule: AppModule = {
  id: "workflow",
  name: "Workflow",
  nameJa: "ワークフロー",
  description: "Request and approval workflow engine",
  descriptionJa: "申請・承認ワークフローエンジン",
  icon: getModuleIcon("workflow"),
  enabled: true,
  order: 40,
  dependencies: ["organization"],
  menus: [
    {
      id: "requests",
      moduleId: "workflow",
      name: "Requests",
      nameJa: "申請",
      path: "/requests",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 17,
      icon: getMenuIcon("requests", "workflow"),
      description: "Submit and track your requests",
      descriptionJa: "申請の提出と進捗確認",
      isImplemented: true,
    },
    {
      id: "approvals",
      moduleId: "workflow",
      name: "Approvals",
      nameJa: "承認",
      path: "/manager/approvals",
      menuGroup: "manager",
      requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 15,
      icon: getMenuIcon("approvals", "workflow"),
      description: "Review and approve requests",
      descriptionJa: "承認依頼の確認と処理",
      isImplemented: true,
    },
    {
      id: "workflowSettings",
      moduleId: "workflow",
      name: "Workflow Settings",
      nameJa: "ワークフロー設定",
      path: "/admin/workflow",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 75,
      mobileEnabled: false,
      icon: getMenuIcon("workflowSettings", "workflow"),
      description: "Manage workflow templates and leave types",
      descriptionJa: "ワークフローテンプレートと休暇種別の管理",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "workflowEngine",
      moduleId: "workflow",
      name: "Workflow Engine",
      nameJa: "ワークフローエンジン",
      description: "Process workflow submissions and approvals",
      descriptionJa: "申請・承認ワークフローの処理",
      apiEndpoints: [
        "/api/workflow/requests",
        "/api/workflow/approvals",
        "/api/workflow/leave-types",
      ],
      enabled: true,
    },
  ],
};
