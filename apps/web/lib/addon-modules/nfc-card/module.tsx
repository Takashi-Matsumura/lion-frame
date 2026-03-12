/**
 * NFCカード アドオンモジュール
 *
 * 社員証（NFCカード）と社員情報の紐付け管理を行うアドオンモジュール。
 * RC-S300 カードリーダーを使用したNFCカードの読み取りに対応。
 * バックオフィスセクションに配置。
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const nfcCardModule: AppModule = {
  id: "nfc-card",
  name: "NFC Card",
  nameJa: "NFCカード",
  description: "NFC card registration and employee badge management",
  descriptionJa: "NFCカード登録と社員証管理",
  icon: getModuleIcon("nfc-card"),
  enabled: true,
  order: 90,
  dependencies: ["organization"],
  menus: [
    {
      id: "nfc-registration",
      moduleId: "nfc-card",
      name: "NFC Registration",
      nameJa: "NFC登録",
      path: "/nfc-registration",
      menuGroup: "backoffice",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      requiredAccessKey: "nfc_registration",
      enabled: true,
      order: 10,
      icon: getMenuIcon("nfc-registration", "nfc-card"),
      description: "Register NFC cards and link to employees",
      descriptionJa: "NFCカードの登録と社員情報の紐付け",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "nfcCardApi",
      moduleId: "nfc-card",
      name: "NFC Card API",
      nameJa: "NFCカードAPI",
      description: "NFC card registration and revocation API",
      descriptionJa: "NFCカード登録・無効化API",
      apiEndpoints: [
        "/api/nfc-card",
        "/api/nfc-card/[id]",
        "/api/nfc-card/employee/[employeeId]",
      ],
      enabled: true,
    },
  ],
};
