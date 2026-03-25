"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiPlus, FiSearch, FiArchive, FiCalendar } from "react-icons/fi";
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
    title?: string | null;
    snapshotPosition?: string | null;
    snapshotDepartment?: string | null;
    snapshotSection?: string | null;
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
  const [officialView, setOfficialView] = useState<"current" | "archive">("current");
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"OFFICIAL" | "PERSONAL">("OFFICIAL");
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const type = tab === "official" ? "OFFICIAL" : "PERSONAL";
      const params = new URLSearchParams({ type });
      if (search) params.set("search", search);
      if (tab === "official") {
        if (officialView === "current") {
          // 今年度: 当年度 + 常設（アーカイブされていないもの）
          params.set("archived", "false");
        } else {
          // アーカイブ: アーカイブ済みのみ
          params.set("archived", "true");
        }
      }
      const res = await fetch(`/api/groups?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, search, officialView]);

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
  const showCreateButton = tab === "official" ? (canCreateOfficial && officialView === "current") : true;

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

        {/* 公式グループ: 今年度 / アーカイブ の切替 */}
        {tab === "official" && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => { setOfficialView("current"); setSearch(""); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  officialView === "current"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FiCalendar className="h-3.5 w-3.5" />
                {t.currentYear}
              </button>
              <button
                type="button"
                onClick={() => { setOfficialView("archive"); setSearch(""); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  officialView === "archive"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FiArchive className="h-3.5 w-3.5" />
                {t.archiveView}
              </button>
            </div>
            <div className="relative max-w-sm flex-1">
              <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {/* マイグループの検索バー */}
        {tab === "personal" && (
          <div className="mt-4 flex items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        <p className="mt-2 text-sm text-muted-foreground">
          {tab === "official" ? t.officialGroupDesc : t.myGroupDesc}
        </p>

        <TabsContent value="official" className="mt-4">
          {officialView === "current" ? (
            <GroupList
              groups={officialGroups}
              loading={loading}
              emptyMessage={t.noOfficialGroups}
              noResultsMessage={t.noResults}
              search={search}
              onGroupClick={handleGroupClick}
              t={t}
            />
          ) : (
            <ArchiveTable
              groups={officialGroups}
              loading={loading}
              emptyMessage={t.noArchivedGroups}
              noResultsMessage={t.noResults}
              search={search}
              onGroupClick={handleGroupClick}
              t={t}
            />
          )}
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <GroupList
            groups={personalGroups}
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

function ArchiveTable({
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
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
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

  // 年度の降順 → 名前順でソート
  const sorted = [...groups].sort((a, b) => {
    const ya = a.fiscalYear ?? 0;
    const yb = b.fiscalYear ?? 0;
    if (yb !== ya) return yb - ya;
    return a.name.localeCompare(b.name);
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">{t.archiveTableYear}</TableHead>
            <TableHead>{t.archiveTableName}</TableHead>
            <TableHead className="w-20">{t.archiveTableMembers}</TableHead>
            <TableHead className="w-36">{t.archiveTableLeader}</TableHead>
            <TableHead className="w-32">{t.archiveTableArchivedAt}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((group) => (
            <TableRow
              key={group.id}
              className="cursor-pointer hover:bg-accent/50"
              onClick={() => onGroupClick(group)}
            >
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {group.fiscalYear != null
                    ? `${group.fiscalYear}${t.fiscalYearSuffix}`
                    : t.ongoing}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{group.name}</TableCell>
              <TableCell>
                {group.memberCount}{t.memberCount}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {group.leader?.name || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(group.archivedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
