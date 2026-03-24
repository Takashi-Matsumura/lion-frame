/**
 * PDF操作 アドオンモジュール
 *
 * マークダウンやExcalidrawなどのデータをPDFとしてエクスポートする機能と、
 * PDFテンプレート（ヘッダー/フッター等）の管理機能を提供。
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const pdfModule: AppModule = {
  id: "pdf",
  name: "PDF",
  nameJa: "PDF操作",
  description: "PDF export with customizable templates",
  descriptionJa: "カスタマイズ可能なテンプレートでPDFをエクスポートします",
  icon: getModuleIcon("pdf"),
  enabled: true,
  order: 30,
  jaOnly: true,
  dependencies: ["system"],
  menus: [
    {
      id: "pdf-management",
      moduleId: "pdf",
      name: "PDF Management",
      nameJa: "PDF管理",
      path: "/pdf-management",
      menuGroup: "backoffice",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      requiredAccessKey: "pdf_management",
      enabled: true,
      order: 25,
      icon: getMenuIcon("pdf-management", "pdf"),
      description: "Manage PDF export templates",
      descriptionJa: "PDFエクスポートテンプレートを管理します",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "pdfService",
      moduleId: "pdf",
      name: "PDF Service",
      nameJa: "PDFサービス",
      apiEndpoints: ["/api/pdf/templates"],
      enabled: true,
    },
  ],
};
