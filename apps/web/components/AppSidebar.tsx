"use client";

import type { Session } from "next-auth";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { useFormBadge } from "@/lib/addon-modules/forms/use-form-badge";
import type { AppMenu } from "@/types/module";
import { SidebarHeaderContent } from "./sidebar/SidebarHeaderContent";
import { SidebarMenuGroup } from "./sidebar/SidebarMenuGroup";
import { SidebarNavigationProvider } from "./sidebar/SidebarNavigationContext";
import { SidebarUserSection } from "./sidebar/SidebarUserSection";

interface AppSidebarProps {
  session: Session;
  accessibleMenus: AppMenu[];
  groupedMenus: Record<string, AppMenu[]>;
  menuGroups: Array<{
    id: string;
    name: string;
    nameJa: string;
    color?: string;
  }>;
  language?: string;
  mustChangePassword?: boolean;
}

export function AppSidebar({
  session,
  groupedMenus,
  menuGroups,
  language = "en",
  mustChangePassword = false,
}: AppSidebarProps) {
  const { width } = useSidebarStore();
  const isMobile = useIsMobile();
  const isAdmin = session.user.role === "ADMIN";
  const formBadgeCount = useFormBadge();

  const menuBadges: Record<string, number> = {};
  if (formBadgeCount > 0) {
    menuBadges["forms"] = formBadgeCount;
  }

  return (
    <SidebarNavigationProvider>
      <Sidebar
        collapsible={isMobile ? "offcanvas" : "icon"}
        className="border-r border-sidebar-border"
        style={
          {
            "--sidebar-width": `${width}px`,
          } as React.CSSProperties
        }
      >
        <SidebarHeaderContent language={language} />

        <SidebarContent>
          {menuGroups.map((group) => {
            const menus = groupedMenus[group.id] || [];
            return (
              <SidebarMenuGroup
                key={group.id}
                group={group}
                menus={menus}
                language={language}
                isAdmin={isAdmin}
                menuBadges={menuBadges}
              />
            );
          })}
        </SidebarContent>

        <SidebarUserSection
          session={session}
          language={language}
          mustChangePassword={mustChangePassword}
        />

        <SidebarRail />
      </Sidebar>
    </SidebarNavigationProvider>
  );
}
