"use client";

import { useSearchParams } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { HolidayManagementClient } from "@/app/admin/holidays/HolidayManagementClient";
import { CompanyEventsTab } from "./components/CompanyEventsTab";
import { CalendarSettingsTab } from "./components/CalendarSettingsTab";

interface CalendarManagementClientProps {
  language: "en" | "ja";
}

export function CalendarManagementClient({
  language,
}: CalendarManagementClientProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "holidays";
  const { open } = useSidebar();
  const { width } = useSidebarStore();

  // ヘッダー本体: 約72px + タブナビ: 約44px = 約116px ≈ 7.25rem
  const headerHeight = "7.25rem";

  return (
    <div
      className="fixed inset-0 flex flex-col transition-all duration-300"
      style={{
        top: headerHeight,
        left: open ? `${width}px` : "4rem",
      }}
    >
      <div className="flex-1 overflow-hidden">
        {tab === "holidays" && (
          <HolidayManagementClient language={language} />
        )}
        {tab === "company-events" && (
          <CompanyEventsTab language={language} />
        )}
        {tab === "settings" && (
          <CalendarSettingsTab language={language} />
        )}
      </div>
    </div>
  );
}
