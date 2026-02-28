/**
 * スケジュールモジュール
 *
 * カレンダーとスケジュール管理を提供するモジュール
 */

import { FaBuilding, FaCalendarCheck, FaCog } from "react-icons/fa";
import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule, AppTab } from "@/types/module";

const calendarManagementTabs: AppTab[] = [
  {
    id: "settings",
    name: "Calendar Settings",
    nameJa: "カレンダー設定",
    icon: <FaCog className="w-5 h-5" />,
    order: 1,
  },
  {
    id: "company-events",
    name: "Company Events",
    nameJa: "会社イベント",
    icon: <FaBuilding className="w-5 h-5" />,
    order: 2,
  },
  {
    id: "holidays",
    name: "Holiday Management",
    nameJa: "祝日管理",
    icon: <FaCalendarCheck className="w-5 h-5" />,
    order: 3,
  },
];

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
      id: "calendarManagement",
      moduleId: "schedule",
      name: "Calendar Management",
      nameJa: "カレンダー管理",
      path: "/admin/calendar-management",
      menuGroup: "admin",
      requiredRoles: ["ADMIN"],
      enabled: true,
      order: 75,
      icon: getMenuIcon("calendarManagement", "schedule"),
      description:
        "Manage holidays, company events, and calendar settings",
      descriptionJa:
        "祝日、会社イベント、カレンダー設定の管理",
      isImplemented: true,
      tabs: calendarManagementTabs,
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
      id: "companyEvents",
      moduleId: "schedule",
      name: "Company Events",
      nameJa: "会社イベント",
      description: "CRUD operations for company events",
      descriptionJa: "会社イベントのCRUD操作",
      apiEndpoints: [
        "/api/calendar/company-events",
        "/api/calendar/company-events/[id]",
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
    {
      id: "concierge",
      moduleId: "schedule",
      name: "AI Concierge",
      nameJa: "AIコンシェルジュ",
      description: "2-step AI schedule concierge with tool selection",
      descriptionJa:
        "2ステップAIスケジュールコンシェルジュ（ツール選択方式）",
      apiEndpoints: ["/api/calendar/concierge"],
      enabled: true,
    },
  ],
};
