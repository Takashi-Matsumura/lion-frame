"use client";

import type { AccessKey } from "@prisma/client";
import { useState } from "react";
import { Hash, Key, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AccessKeyManager } from "@/components/AccessKeyManager";
import { TagsTabContent } from "./TagsTab";
import { BadgesTab } from "./BadgesTab";
import type { AppMenu, AppModule } from "@/types/module";

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

interface SettingsTabProps {
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

type SubTab = "access-keys" | "tags" | "badges";

const subTabs: {
  id: SubTab;
  name: string;
  nameJa: string;
  icon: typeof Key;
}[] = [
  { id: "access-keys", name: "Access Keys", nameJa: "アクセスキー", icon: Key },
  { id: "tags", name: "Tags", nameJa: "タグ", icon: Hash },
  { id: "badges", name: "Badges", nameJa: "バッジ", icon: Shield },
];

export function SettingsTab({
  language,
  currentUserId,
  accessKeys,
  users,
  menus,
  modules,
}: SettingsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("access-keys");

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      {/* サブタブナビゲーション */}
      <div className="border-b px-4">
        <nav className="flex gap-1">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                <Icon className="h-4 w-4" />
                {language === "ja" ? tab.nameJa : tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* サブタブコンテンツ */}
      <CardContent className="p-6 flex-1 flex flex-col min-h-0">
        {activeSubTab === "access-keys" && (
          <AccessKeyManager
            accessKeys={accessKeys}
            users={users}
            menus={menus}
            modules={modules}
            adminId={currentUserId}
            language={language}
          />
        )}

        {activeSubTab === "tags" && (
          <TagsTabContent language={language} />
        )}

        {activeSubTab === "badges" && (
          <BadgesTab language={language} />
        )}
      </CardContent>
    </Card>
  );
}
