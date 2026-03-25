"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FiUsers, FiUser, FiArchive } from "react-icons/fi";

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
  const isArchived = !!group.archivedAt;

  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-accent/50 ${isArchived ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug truncate">{group.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            <FiUsers className="mr-1 h-3 w-3" />
            {group.memberCount}
            {t.memberCount}
          </Badge>
        </div>
        {group.type === "OFFICIAL" && (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {group.fiscalYear != null ? `${group.fiscalYear}${t.fiscalYearSuffix}` : t.ongoing}
            </Badge>
            {isArchived && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                <FiArchive className="mr-0.5 h-2.5 w-2.5" />
                {t.archived}
              </Badge>
            )}
          </div>
        )}
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
