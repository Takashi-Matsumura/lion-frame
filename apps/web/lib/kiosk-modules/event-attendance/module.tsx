/**
 * イベント出席管理 キオスクモジュール
 *
 * NFCカードによるイベント出席管理キオスク。
 * 管理UI（メインアプリ内）+ キオスク画面（独立）の二重構造。
 */

import { createIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const eventAttendanceModule: AppModule = {
  id: "event-attendance",
  name: "Event Attendance",
  nameJa: "イベント出席",
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
      description: "Manage kiosk sessions and attendance records",
      descriptionJa: "キオスクセッションと出席記録の管理",
      isImplemented: true,
      tabs: [
        {
          id: "events",
          name: "Event Attendance",
          nameJa: "イベント出欠",
          icon: createIcon("event-attendance", "w-5 h-5"),
          order: 1,
        },
        {
          id: "attendance",
          name: "Attendance",
          nameJa: "出席記録",
          icon: createIcon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", "w-5 h-5"),
          order: 2,
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
