/**
 * キオスクモジュール
 *
 * NFCカードによるイベント出席管理キオスク。
 * 管理UI（メインアプリ内）+ キオスク画面（独立）の二重構造。
 */

import { createIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const eventAttendanceModule: AppModule = {
  id: "event-attendance",
  name: "Kiosk",
  nameJa: "キオスク",
  description: "NFC-based event check-in kiosk",
  descriptionJa: "NFCカードによるイベント出席管理キオスク",
  icon: getModuleIcon("event-attendance"),
  enabled: true,
  order: 95,
  dependencies: ["nfc-card"],
  kiosk: {
    basePath: "/kiosk/events",
    requiresNfc: true,
  },
  menus: [
    {
      id: "kiosk-manager",
      moduleId: "event-attendance",
      name: "Kiosk Manager",
      nameJa: "キオスク管理",
      path: "/kiosk-manager",
      menuGroup: "developer",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 10,
      icon: getModuleIcon("kiosk-manager"),
      description: "Manage kiosk events and attendance records",
      descriptionJa: "キオスクイベントと出席記録の管理",
      isImplemented: true,
      tabs: [
        {
          id: "events",
          name: "Event Attendance",
          nameJa: "イベント出欠",
          icon: createIcon("event-attendance", "w-5 h-5"),
          order: 1,
        },
      ],
    },
  ],
  services: [
    {
      id: "kioskApi",
      moduleId: "event-attendance",
      name: "Kiosk API",
      nameJa: "キオスクAPI",
      description: "Kiosk session management and check-in API",
      descriptionJa: "キオスクセッション管理・チェックインAPI",
      apiEndpoints: [
        "/api/kiosk/sessions",
        "/api/kiosk/login",
        "/api/kiosk/events/[token]/check-in",
      ],
      enabled: true,
    },
  ],
};
