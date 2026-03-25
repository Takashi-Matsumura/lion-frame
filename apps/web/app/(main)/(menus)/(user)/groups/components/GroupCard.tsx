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
    memberCount: number;
    leader: { id: string; name: string; position: string } | null;
  };
  onClick: () => void;
  t: Record<string, string>;
}

export function GroupCard({ group, onClick, t }: GroupCardProps) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{group.name}</CardTitle>
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
      <CardContent className="pt-0">
        {group.leader && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FiUser className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">
              {group.leader.name}
            </span>
            <span>({t.leader})</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
