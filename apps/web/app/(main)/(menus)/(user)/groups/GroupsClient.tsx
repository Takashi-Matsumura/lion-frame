"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiPlus, FiSearch, FiArchive } from "react-icons/fi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { translations, type Language } from "./translations";
import { GroupCard } from "./components/GroupCard";
import { GroupCreateDialog } from "./components/GroupCreateDialog";
import { GroupDetailDialog } from "./components/GroupDetailDialog";

type Role = "GUEST" | "USER" | "MANAGER" | "EXECUTIVE" | "ADMIN";

const MANAGER_ROLES: Role[] = ["MANAGER", "EXECUTIVE", "ADMIN"];

function getCurrentFiscalYear(): number {
  const now = new Date();
  const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return jst.getMonth() + 1 >= 4 ? jst.getFullYear() : jst.getFullYear() - 1;
}

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  type: "OFFICIAL" | "PERSONAL";
  fiscalYear?: number | null;
  archivedAt?: string | null;
  createdBy: string;
  ownerName: string | null;
  memberCount: number;
  leader: { id: string; name: string; position: string } | null;
  members: {
    id: string;
    role: "LEADER" | "MEMBER";
    employeeId: string;
    employee: {
      id: string;
      employeeId: string;
      name: string;
      nameKana: string | null;
      position: string;
      department: { name: string } | null;
      section: { name: string } | null;
      course: { name: string } | null;
    };
  }[];
}

interface Props {
  language: Language;
  userRole: string;
  userId: string;
}

export function GroupsClient({ language, userRole, userId }: Props) {
  const t = translations[language];
  const role = userRole as Role;
  const canCreateOfficial = MANAGER_ROLES.includes(role);

  const [tab, setTab] = useState<"official" | "personal">("official");
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"OFFICIAL" | "PERSONAL">("OFFICIAL");
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  // 年度フィルタ（公式グループ用）
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // 年度一覧を取得
  useEffect(() => {
    fetch("/api/groups/fiscal-years")
      .then((res) => res.ok ? res.json() : { years: [] })
      .then((data) => {
        const years: number[] = data.years || [];
        setAvailableYears(years);
        // 当年度がリストにない場合も選択肢に含めるためフィルタはそのまま
      });
  }, [groups]); // グループ変更時に再取得

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const type = tab === "official" ? "OFFICIAL" : "PERSONAL";
      const params = new URLSearchParams({ type });
      if (search) params.set("search", search);
      if (tab === "official") {
        params.set("fiscalYear", fiscalYearFilter);
        params.set("archived", showArchived ? "all" : "false");
      }
      const res = await fetch(`/api/groups?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, search, fiscalYearFilter, showArchived]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreate = () => {
    setCreateType(tab === "official" ? "OFFICIAL" : "PERSONAL");
    setCreateOpen(true);
  };

  const handleCreated = () => {
    setCreateOpen(false);
    fetchGroups();
  };

  const handleGroupClick = async (group: GroupData) => {
    const res = await fetch(`/api/groups/${group.id}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedGroup(data.group);
    }
  };

  const handleDetailClose = () => {
    setSelectedGroup(null);
    fetchGroups();
  };

  const officialGroups = groups.filter((g) => g.type === "OFFICIAL");
  const personalGroups = groups.filter((g) => g.type === "PERSONAL");
  const displayGroups = tab === "official" ? officialGroups : personalGroups;
  const showCreateButton = tab === "official" ? canCreateOfficial : true;

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as "official" | "personal");
          setSearch("");
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="official">{t.officialGroups}</TabsTrigger>
            <TabsTrigger value="personal">{t.myGroups}</TabsTrigger>
          </TabsList>
          {showCreateButton && (
            <Button size="sm" onClick={handleCreate}>
              <FiPlus className="mr-1 h-4 w-4" />
              {t.createGroup}
            </Button>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {tab === "official" && (
            <Select value={fiscalYearFilter} onValueChange={setFiscalYearFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allYears}</SelectItem>
                <SelectItem value="ongoing">{t.ongoing}</SelectItem>
                {(() => {
                  const currentFY = getCurrentFiscalYear();
                  const allYears = [...new Set([currentFY, ...availableYears])].sort((a, b) => b - a);
                  return allYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}{t.fiscalYearSuffix}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          )}
          <div className="relative max-w-sm flex-1">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {tab === "official" && (
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                showArchived
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:bg-accent"
              }`}
            >
              <FiArchive className="h-3.5 w-3.5" />
              {t.showArchived}
            </button>
          )}
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          {tab === "official" ? t.officialGroupDesc : t.myGroupDesc}
        </p>

        <TabsContent value="official" className="mt-4">
          <GroupList
            groups={displayGroups}
            loading={loading}
            emptyMessage={t.noOfficialGroups}
            noResultsMessage={t.noResults}
            search={search}
            onGroupClick={handleGroupClick}
            t={t}
          />
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <GroupList
            groups={displayGroups}
            loading={loading}
            emptyMessage={t.noMyGroups}
            noResultsMessage={t.noResults}
            search={search}
            onGroupClick={handleGroupClick}
            t={t}
          />
        </TabsContent>
      </Tabs>

      <GroupCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        type={createType}
        onCreated={handleCreated}
        t={t}
      />

      {selectedGroup && (
        <GroupDetailDialog
          group={selectedGroup}
          onClose={handleDetailClose}
          canEdit={role === "ADMIN" || selectedGroup.createdBy === userId}
          userRole={role}
          t={t}
        />
      )}
    </div>
  );
}

function GroupList({
  groups,
  loading,
  emptyMessage,
  noResultsMessage,
  search,
  onGroupClick,
  t,
}: {
  groups: GroupData[];
  loading: boolean;
  emptyMessage: string;
  noResultsMessage: string;
  search: string;
  onGroupClick: (g: GroupData) => void;
  t: Record<string, string>;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          {search ? noResultsMessage : emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          onClick={() => onGroupClick(group)}
          t={t}
        />
      ))}
    </div>
  );
}
