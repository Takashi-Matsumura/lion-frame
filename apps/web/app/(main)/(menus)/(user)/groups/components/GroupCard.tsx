"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FiUsers, FiUser } from "react-icons/fi";

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    type: "OFFICIAL" | "PERSONAL";
    fiscalYear?: number | null;
    archivedAt?: string | null;
    ownerName?: string | null;
    memberCount: number;
    leader: { id: string; name: string; position: string } | null;
  };
  onClick: () => void;
  t: Record<string, string>;
}

export function GroupCard({ group, onClick, t }: GroupCardProps) {
  const isStanding = group.type === "OFFICIAL" && group.fiscalYear == null;
  const categoryLabel = isStanding
    ? t.ongoing
    : group.fiscalYear != null
      ? `${group.fiscalYear}${t.fiscalYearSuffix}`
      : null;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50 overflow-hidden"
      onClick={onClick}
    >
      {/* カテゴリバー: 常設=青系、年度=アクセント系 */}
      {group.type === "OFFICIAL" && categoryLabel && (
        <div
          className={`px-3 py-1 text-xs font-medium ${
            isStanding
              ? "bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
              : "bg-primary/10 text-primary"
          }`}
        >
          {categoryLabel}
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug truncate">{group.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            <FiUsers className="mr-1 h-3 w-3" />
            {group.memberCount}
            {t.memberCount}
          </Badge>
        </div>
        {group.description && (
          <CardDescription className="line-clamp-2 text-sm">
            {group.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {group.leader && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FiUser className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">
              {group.leader.name}
            </span>
            <span>({t.leader})</span>
          </div>
        )}
        {group.type === "OFFICIAL" && group.ownerName && (
          <div className="text-xs text-muted-foreground">
            {t.owner}: {group.ownerName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
