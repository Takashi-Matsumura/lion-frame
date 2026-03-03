"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaPlus, FaUsers } from "react-icons/fa";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { HistoryTab } from "./components/HistoryTab";
import { ImportTab } from "./components/ImportTab";
import { OrganizeTab } from "./components/OrganizeTab";
import { PositionsTab } from "./components/PositionsTab";
import { dataManagementTranslations } from "./translations";

interface Organization {
  id: string;
  name: string;
  _count: {
    employees: number;
  };
}

interface DataManagementClientProps {
  language: "en" | "ja";
  organizations: Organization[];
}

export function DataManagementClient({
  language,
  organizations,
}: DataManagementClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || "import";
  const tab = rawTab === "employees" ? "organize" : rawTab;
  const t = dataManagementTranslations[language];
  const isMobile = useIsMobile();
  const { open } = useSidebar();
  const { width } = useSidebarStore();

  // Redirect ?tab=employees to ?tab=organize
  useEffect(() => {
    if (rawTab === "employees") {
      router.replace("?tab=organize");
    }
  }, [rawTab, router]);

  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    organizations[0]?.id || "",
  );
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Group Name (2組織以上の場合のみ)
  const [groupName, setGroupName] = useState("");
  const [groupNameOriginal, setGroupNameOriginal] = useState("");
  const [isSavingGroupName, setIsSavingGroupName] = useState(false);

  useEffect(() => {
    if (organizations.length >= 2) {
      fetch("/api/admin/organization/group-name")
        .then((res) => res.json())
        .then((data) => {
          setGroupName(data.groupName || "");
          setGroupNameOriginal(data.groupName || "");
        })
        .catch(() => {});
    }
  }, [organizations.length]);

  const handleSaveGroupName = async () => {
    setIsSavingGroupName(true);
    try {
      const res = await fetch("/api/admin/organization/group-name", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName }),
      });
      if (res.ok) {
        setGroupNameOriginal(groupName);
      }
    } catch (error) {
      console.error("Failed to save group name:", error);
    } finally {
      setIsSavingGroupName(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;

    setIsCreatingOrg(true);
    try {
      const response = await fetch("/api/admin/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });

      if (response.ok) {
        const { organization } = await response.json();
        setSelectedOrgId(organization.id);
        setNewOrgName("");
        setShowCreateOrg(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create organization:", error);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // ヘッダー本体: 約72px + タブナビ: 約44px = 約116px ≈ 7.25rem
  const headerHeight = "7.25rem";

  const sidebarLeft = isMobile ? "0" : open ? `${width}px` : "4rem";

  return (
    <div
      className="fixed inset-0 flex flex-col transition-all duration-300"
      style={{
        top: headerHeight,
        left: sidebarLeft,
      }}
    >
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto p-6 h-full flex flex-col">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="p-6 flex-1 flex flex-col min-h-0">
              {/* Organization Selector */}
              <div className="border-b border-border pb-4 mb-6 shrink-0">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground">
                {t.selectOrganization}:
              </label>
              {organizations.length > 0 ? (
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org._count.employees}名)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {t.noOrganization}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowCreateOrg(!showCreateOrg)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                {t.createOrganization}
              </button>

              {/* Group Name (2組織以上の場合のみ、右端に配置) */}
              {organizations.length >= 2 && (
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">
                    {t.groupName}:
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder={t.groupNamePlaceholder}
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  />
                  <button
                    type="button"
                    onClick={handleSaveGroupName}
                    disabled={isSavingGroupName || groupName === groupNameOriginal}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
                  >
                    {isSavingGroupName ? t.loading : t.save}
                  </button>
                </div>
              )}
            </div>

            {/* Create Organization Form */}
            {showCreateOrg && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder={t.organizationName}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateOrganization}
                    disabled={isCreatingOrg || !newOrgName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreatingOrg ? t.loading : t.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateOrg(false);
                      setNewOrgName("");
                    }}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>

              {/* Tab Content */}
              <div className="flex-1 flex flex-col min-h-0">
                {tab === "positions" ? (
                  <PositionsTab language={language} t={t} />
                ) : !selectedOrgId && organizations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FaUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t.noOrganization}</p>
                  </div>
                ) : (
                  <>
                    {tab === "import" && (
                      <ImportTab
                        organizationId={selectedOrgId}
                        language={language}
                        t={t}
                      />
                    )}
                    {tab === "organize" && (
                      <OrganizeTab
                        organizationId={selectedOrgId}
                        language={language}
                        t={t}
                      />
                    )}
                    {tab === "history" && (
                      <HistoryTab
                        organizationId={selectedOrgId}
                        language={language}
                        t={t}
                      />
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
