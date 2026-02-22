"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { reservationTranslations } from "../translations";

interface Reservation {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  cancelReason: string | null;
  resource: {
    id: string;
    name: string;
    nameEn: string | null;
    category: {
      name: string;
      nameEn: string | null;
      type: string;
      color: string | null;
    };
  };
}

interface MyReservationsProps {
  language: "en" | "ja";
}

export default function MyReservations({ language }: MyReservationsProps) {
  const t = reservationTranslations[language];
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const statusLabels: Record<string, string> = {
    PENDING: t.statusPending,
    CONFIRMED: t.statusConfirmed,
    CANCELLED: t.statusCancelled,
    RETURNED: t.statusReturned,
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    CONFIRMED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    RETURNED: "bg-blue-100 text-blue-800",
  };

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/general-affairs/reservations");
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

  const handleCancel = async (id: string) => {
    if (!window.confirm(t.cancelConfirm)) return;
    setCancelling(id);
    try {
      const res = await fetch(`/api/general-affairs/reservations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchReservations();
      }
    } finally {
      setCancelling(null);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(language === "ja" ? "ja-JP" : "en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t.noReservations}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map((rv) => {
        const resourceName =
          language === "ja"
            ? rv.resource.name
            : rv.resource.nameEn || rv.resource.name;
        const canCancel =
          rv.status === "PENDING" || rv.status === "CONFIRMED";

        return (
          <div
            key={rv.id}
            className="border rounded-lg p-4 flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{rv.title}</h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[rv.status] || ""}`}
                >
                  {statusLabels[rv.status]}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                {rv.resource.category.color && (
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: rv.resource.category.color }}
                  />
                )}
                {resourceName}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDateTime(rv.startTime)} ~ {formatDateTime(rv.endTime)}
              </div>
              {rv.cancelReason && (
                <div className="text-xs text-destructive mt-1">
                  {rv.cancelReason}
                </div>
              )}
            </div>
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleCancel(rv.id)}
                disabled={cancelling === rv.id}
              >
                {cancelling === rv.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
