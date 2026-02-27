"use client";

import type { AccessKey } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import {
  AccessKeyManagerSkeleton,
  AnnouncementsTabSkeleton,
  ModulesTabSkeleton,
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
const AccessKeyManager = dynamic(() => import("@/components/AccessKeyManager").then((m) => ({ default: m.AccessKeyManager })), {
  loading: () => <AccessKeyManagerSkeleton />,
});
const ModulesTab = dynamic(() => import("./components/ModulesTab").then((m) => ({ default: m.ModulesTab })), {
  loading: () => <ModulesTabSkeleton />,
});
const AnnouncementsTab = dynamic(() => import("./components/AnnouncementsTab").then((m) => ({ default: m.AnnouncementsTab })), {
  loading: () => <AnnouncementsTabSkeleton />,
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
  const isMobile = useIsMobile();
  const activeTab = (searchParams.get("tab") as TabType) || "users";

  const headerHeight = "7.25rem";

  return (
    <div
      className="fixed inset-0 flex flex-col bg-muted/30 transition-all duration-300"
      style={{
        top: headerHeight,
        left: isMobile ? "0" : "4rem",
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
