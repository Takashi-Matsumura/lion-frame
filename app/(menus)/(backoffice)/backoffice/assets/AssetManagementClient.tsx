"use client";

import { useSearchParams } from "next/navigation";
import CategoriesTab from "./components/CategoriesTab";
import ResourcesTab from "./components/ResourcesTab";
import ApprovalsTab from "./components/ApprovalsTab";
import StatsTab from "./components/StatsTab";

type TabId = "categories" | "resources" | "approvals" | "stats";

interface AssetManagementClientProps {
  language: "en" | "ja";
}

export default function AssetManagementClient({
  language,
}: AssetManagementClientProps) {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "categories";

  return (
    <div className="pt-12">
      {activeTab === "categories" && <CategoriesTab language={language} />}
      {activeTab === "resources" && <ResourcesTab language={language} />}
      {activeTab === "approvals" && <ApprovalsTab language={language} />}
      {activeTab === "stats" && <StatsTab language={language} />}
    </div>
  );
}
