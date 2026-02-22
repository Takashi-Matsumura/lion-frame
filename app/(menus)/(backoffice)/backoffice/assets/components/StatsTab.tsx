"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, BarChart3, TrendingUp } from "lucide-react";
import { assetTranslations } from "../translations";

interface Reservation {
  id: string;
  status: string;
  startTime: string;
  resource: {
    id: string;
    name: string;
    nameEn: string | null;
    category: {
      type: string;
      name: string;
      nameEn: string | null;
      color: string | null;
    };
  };
}

interface StatsTabProps {
  language: "en" | "ja";
}

export default function StatsTab({ language }: StatsTabProps) {
  const t = assetTranslations[language];
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const typeLabels: Record<string, string> = {
    ROOM: t.typeRoom,
    VEHICLE: t.typeVehicle,
    EQUIPMENT: t.typeEquipment,
  };

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/general-affairs/reservations?all=true");
      if (res.ok) {
        setReservations(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 種別ごとの予約数
  const byType: Record<string, number> = {};
  for (const rv of reservations) {
    const type = rv.resource.category.type;
    byType[type] = (byType[type] || 0) + 1;
  }

  // リソースごとの利用数（上位10件）
  const byResource: Record<string, { name: string; count: number; color: string | null }> =
    {};
  for (const rv of reservations) {
    if (rv.status === "CANCELLED") continue;
    const key = rv.resource.id;
    if (!byResource[key]) {
      byResource[key] = {
        name:
          language === "ja"
            ? rv.resource.name
            : rv.resource.nameEn || rv.resource.name,
        count: 0,
        color: rv.resource.category.color,
      };
    }
    byResource[key].count++;
  }
  const topResources = Object.values(byResource)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxCount = Math.max(...topResources.map((r) => r.count), 1);

  // ステータス内訳
  const byStatus: Record<string, number> = {};
  for (const rv of reservations) {
    byStatus[rv.status] = (byStatus[rv.status] || 0) + 1;
  }

  const statusLabels: Record<string, string> = {
    PENDING: t.statusPending,
    CONFIRMED: t.statusConfirmed,
    CANCELLED: t.statusCancelled,
    RETURNED: t.statusReturned,
  };

  const statusColors: Record<string, string> = {
    PENDING: "#f59e0b",
    CONFIRMED: "#10b981",
    CANCELLED: "#ef4444",
    RETURNED: "#3b82f6",
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t.stats}</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{reservations.length}</div>
          <div className="text-sm text-muted-foreground">
            {t.totalReservations}
          </div>
        </div>
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="border rounded-lg p-4">
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-sm text-muted-foreground">
              {typeLabels[type] || type}
            </div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          {t.status}
        </h3>
        <div className="flex gap-6 flex-wrap">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColors[status] }}
              />
              <span className="text-sm">
                {statusLabels[status]}: {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Most used resources */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {t.mostUsedResources}
        </h3>
        {topResources.length === 0 ? (
          <div className="text-muted-foreground text-sm">{t.noData}</div>
        ) : (
          <div className="space-y-2">
            {topResources.map((res, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate">{res.name}</span>
                <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(res.count / maxCount) * 100}%`,
                      backgroundColor: res.color || "#3b82f6",
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">
                  {res.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
