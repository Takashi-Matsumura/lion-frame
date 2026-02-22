"use client";

import { MapPin, Users, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reservationTranslations } from "../translations";

interface Resource {
  id: string;
  name: string;
  nameEn: string | null;
  location: string | null;
  capacity: number | null;
  notes: string | null;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    nameEn: string | null;
    type: string;
    color: string | null;
    requiresApproval: boolean;
  };
}

interface ResourceCardProps {
  language: "en" | "ja";
  resource: Resource;
  onSelect: (resource: Resource) => void;
}

export default function ResourceCard({
  language,
  resource,
  onSelect,
}: ResourceCardProps) {
  const t = reservationTranslations[language];
  const name =
    language === "ja"
      ? resource.name
      : resource.nameEn || resource.name;
  const categoryName =
    language === "ja"
      ? resource.category.name
      : resource.category.nameEn || resource.category.name;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium">{name}</h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {resource.category.color && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: resource.category.color }}
              />
            )}
            {categoryName}
          </div>
        </div>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground mb-3">
        {resource.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {resource.location}
          </div>
        )}
        {resource.capacity && (
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {resource.capacity}
            {t.persons}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {resource.category.requiresApproval ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-600">{t.requiresApproval}</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-600">{t.instantConfirm}</span>
            </>
          )}
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => onSelect(resource)}
      >
        {t.viewSchedule}
      </Button>
    </div>
  );
}
