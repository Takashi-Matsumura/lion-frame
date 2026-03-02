/**
 * ワークフロー（申請・承認）アドオンモジュール
 *
 * レポートライン基盤（supervisorIdチェーン）を活用した
 * 申請・承認ワークフローを提供するアドオンモジュール。
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const workflowModule: AppModule = {
  id: "workflow",
  name: "Workflow",
  nameJa: "ワークフロー",
  description: "Request and approval workflow",
  descriptionJa: "申請・承認ワークフロー",
  icon: getModuleIcon("workflow"),
  enabled: true,
  order: 25,
  dependencies: ["system", "organization"],
  menus: [
    {
      id: "requests",
      moduleId: "workflow",
      name: "Requests",
      nameJa: "申請",
      path: "/workflow",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 20,
      icon: getMenuIcon("requests", "workflow"),
      description: "Submit and track workflow requests",
      descriptionJa: "申請の作成と進捗確認",
      isImplemented: true,
    },
    {
      id: "approvals",
      moduleId: "workflow",
      name: "Approvals",
      nameJa: "承認",
      path: "/workflow-approvals",
      menuGroup: "manager",
      requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 10,
      icon: getMenuIcon("approvals", "workflow"),
      description: "Review and approve workflow requests",
      descriptionJa: "申請の確認と承認処理",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "workflowRequests",
      moduleId: "workflow",
      name: "Workflow Requests",
      nameJa: "ワークフロー申請",
      description: "CRUD operations for workflow requests",
      descriptionJa: "ワークフロー申請のCRUD操作",
      apiEndpoints: [
        "/api/workflow/requests",
        "/api/workflow/templates",
      ],
      enabled: true,
    },
    {
      id: "workflowApprovals",
      moduleId: "workflow",
      name: "Workflow Approvals",
      nameJa: "ワークフロー承認",
      description: "Approval operations for workflow requests",
      descriptionJa: "ワークフロー申請の承認操作",
      apiEndpoints: [
        "/api/workflow/approvals",
        "/api/workflow/approvals/history",
      ],
      enabled: true,
    },
  ],
};
