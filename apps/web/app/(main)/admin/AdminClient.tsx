"use client";

import type { AccessKey } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import {
  AnnouncementsTabSkeleton,
  ModulesTabSkeleton,
  SettingsTabSkeleton,
  SystemTabSkeleton,
  UsersTabSkeleton,
} from "./components/skeletons";
import type { AppMenu, AppModule } from "@/types/module";

// bundle-dynamic-imports: タブコンポーネントを遅延読み込み
const SystemTab = dynamic(() => import("./components/SystemTab").then((m) => ({ default: m.SystemTab })), {
  loading: () => <SystemTabSkeleton />,
});
const UsersTab = dynamic(() => import("./components/UsersTab").then((m) => ({ default: m.UsersTab })), {
  loading: () => <UsersTabSkeleton />,
});
const ModulesTab = dynamic(() => import("./components/ModulesTab").then((m) => ({ default: m.ModulesTab })), {
  loading: () => <ModulesTabSkeleton />,
});
const AnnouncementsTab = dynamic(() => import("./components/AnnouncementsTab").then((m) => ({ default: m.AnnouncementsTab })), {
  loading: () => <AnnouncementsTabSkeleton />,
});
const SettingsTab = dynamic(() => import("./components/SettingsTab").then((m) => ({ default: m.SettingsTab })), {
  loading: () => <SettingsTabSkeleton />,
});

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
  | "settings"
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
  const isMobile = useIsMobile();
  const { open } = useSidebar();
  const { width } = useSidebarStore();
  // 旧タブIDの後方互換: access-keys, tags → settings に統合
  const rawTab = searchParams.get("tab") || "users";
  const activeTab = (
    rawTab === "access-keys" || rawTab === "tags" ? "settings" : rawTab
  ) as TabType;

  const headerHeight = "7.25rem";
  const sidebarLeft = isMobile ? "0" : open ? `${width}px` : "4rem";

  return (
    <div
      className="fixed inset-0 flex flex-col bg-muted/30 transition-all duration-300"
      style={{
        top: headerHeight,
        left: sidebarLeft,
      }}
    >
      <div className={`flex-1 ${["users", "settings", "announcements"].includes(activeTab) ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className={`max-w-7xl mx-auto p-6 ${["users", "settings", "announcements"].includes(activeTab) ? "h-full flex flex-col" : "space-y-6"}`}>
          {/* システム情報タブ */}
          {activeTab === "system" && (
            <SystemTab language={language} />
          )}

          {/* アカウント管理タブ */}
          {activeTab === "users" && (
            <UsersTab language={language} currentUserId={currentUserId} />
          )}

          {/* 詳細設定タブ（アクセスキー・タグ・バッジ） */}
          {activeTab === "settings" && (
            <SettingsTab
              language={language}
              currentUserId={currentUserId}
              accessKeys={accessKeys}
              users={users}
              menus={menus}
              modules={modules}
            />
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
