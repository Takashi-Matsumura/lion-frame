"use client";

import type { AccessKey } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { AccessKeyManager } from "@/components/AccessKeyManager";
import { Card, CardContent } from "@/components/ui/card";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import type { AppMenu, AppModule } from "@/types/module";
import { AnnouncementsTab } from "./components/AnnouncementsTab";
import { ModulesTab } from "./components/ModulesTab";
import { SystemTab } from "./components/SystemTab";
import { UsersTab } from "./components/UsersTab";

type AccessKeyWithTargetUser = AccessKey & {
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  _count: {
    userAccessKeys: number;
  };
};

interface AdminClientProps {
  language: "en" | "ja";
  currentUserId: string;
  accessKeys: AccessKeyWithTargetUser[];
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  }>;
  menus: AppMenu[];
  modules: AppModule[];
}

type TabType =
  | "system"
  | "users"
  | "access-keys"
  | "modules"
  | "announcements";

export function AdminClient({
  language,
  currentUserId,
  accessKeys,
  users,
  menus,
  modules,
}: AdminClientProps) {
  const searchParams = useSearchParams();
  const { open } = useSidebar();
  const { width } = useSidebarStore();
  const activeTab = (searchParams.get("tab") as TabType) || "users";

  const headerHeight = "7.25rem";

  return (
    <div
      className="fixed inset-0 flex flex-col bg-muted/30 transition-all duration-300"
      style={{
        top: headerHeight,
        left: open ? `${width}px` : "4rem",
      }}
    >
      <div className={`flex-1 ${["users", "access-keys", "announcements"].includes(activeTab) ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className={`max-w-7xl mx-auto p-6 ${["users", "access-keys", "announcements"].includes(activeTab) ? "h-full flex flex-col" : "space-y-6"}`}>
          {/* システム情報タブ */}
          {activeTab === "system" && (
            <SystemTab language={language} />
          )}

          {/* アカウント管理タブ */}
          {activeTab === "users" && (
            <UsersTab language={language} currentUserId={currentUserId} />
          )}

          {/* アクセスキー管理タブ */}
          {activeTab === "access-keys" && (
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="p-8 flex-1 flex flex-col min-h-0">
                <AccessKeyManager
                  accessKeys={accessKeys}
                  users={users}
                  menus={menus}
                  modules={modules}
                  adminId={currentUserId}
                  language={language}
                />
              </CardContent>
            </Card>
          )}

          {/* モジュール管理タブ */}
          {activeTab === "modules" && (
            <ModulesTab language={language} />
          )}

          {/* アナウンスタブ */}
          {activeTab === "announcements" && (
            <AnnouncementsTab language={language} />
          )}
        </div>
      </div>
    </div>
  );
}
