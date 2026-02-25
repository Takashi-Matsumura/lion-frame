/**
 * スケジュールモジュール
 *
 * カレンダーとスケジュール管理を提供するモジュール
 */

import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const scheduleModule: AppModule = {
  id: "schedule",
  name: "Schedule",
  nameJa: "スケジュール",
  description: "Calendar and schedule management",
  descriptionJa: "カレンダーとスケジュールの管理",
  icon: getModuleIcon("schedule"),
  enabled: true,
  order: 15,
  dependencies: [],
  menus: [
    {
      id: "myCalendar",
      moduleId: "schedule",
      name: "Calendar",
      nameJa: "カレンダー",
      path: "/schedule",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 12,
      icon: getMenuIcon("myCalendar", "schedule"),
      description: "View and manage your calendar",
      descriptionJa: "カレンダーの表示と予定管理",
      isImplemented: true,
    },
    {
      id: "holidayManagement",
      moduleId: "schedule",
      name: "Holiday Management",
      nameJa: "祝日管理",
      path: "/admin/holidays",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 75,
      description: "Manage holidays and generate national holidays with AI",
      descriptionJa: "祝日の管理とAIによる国民の祝日の一括生成",
      isImplemented: true,
    },
  ],
  services: [
    {
      id: "calendarEvents",
      moduleId: "schedule",
      name: "Calendar Events",
      nameJa: "カレンダーイベント",
      description: "CRUD operations for calendar events",
      descriptionJa: "カレンダーイベントのCRUD操作",
      apiEndpoints: [
        "/api/calendar/app-events",
        "/api/calendar/app-events/[id]",
      ],
      enabled: true,
    },
    {
      id: "holidays",
      moduleId: "schedule",
      name: "Holiday Management",
      nameJa: "祝日管理",
      description: "CRUD operations for holidays with AI generation",
      descriptionJa: "祝日のCRUD操作とAI生成",
      apiEndpoints: [
        "/api/calendar/holidays",
        "/api/calendar/holidays/[id]",
        "/api/calendar/holidays/generate",
      ],
      enabled: true,
    },
  ],
};
