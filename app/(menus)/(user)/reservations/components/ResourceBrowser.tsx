"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { reservationTranslations } from "../translations";
import ResourceCard from "./ResourceCard";
import ResourceCalendarView from "./ResourceCalendarView";

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

interface ResourceBrowserProps {
  language: "en" | "ja";
}

const TYPE_FILTERS = [
  { key: "", label: "all" },
  { key: "ROOM", label: "typeRoom" },
  { key: "VEHICLE", label: "typeVehicle" },
  { key: "EQUIPMENT", label: "typeEquipment" },
] as const;

export default function ResourceBrowser({ language }: ResourceBrowserProps) {
  const t = reservationTranslations[language];
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ isActive: "true" });
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(
        `/api/general-affairs/resources?${params.toString()}`,
      );
      if (res.ok) {
        setResources(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch resources:", err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Type filter tabs */}
      <div className="flex gap-1">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => {
              setTypeFilter(filter.key);
              setSelectedResource(null);
            }}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              typeFilter === filter.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t[filter.label]}
          </button>
        ))}
      </div>

      {/* Selected resource calendar */}
      {selectedResource && (
        <ResourceCalendarView
          language={language}
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}

      {/* Resource grid */}
      {resources.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t.noResources}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              language={language}
              resource={resource}
              onSelect={setSelectedResource}
            />
          ))}
        </div>
      )}
    </div>
  );
}
