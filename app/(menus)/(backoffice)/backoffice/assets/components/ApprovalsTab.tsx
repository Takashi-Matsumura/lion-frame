"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { assetTranslations } from "../translations";

interface Reservation {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  approvedBy: string | null;
  returnedAt: string | null;
  cancelReason: string | null;
  user: { id: string; name: string | null; email: string | null };
  resource: {
    id: string;
    name: string;
    nameEn: string | null;
    category: {
      id: string;
      name: string;
      nameEn: string | null;
      type: string;
      color: string | null;
      requiresApproval: boolean;
    };
  };
}

interface ApprovalsTabProps {
  language: "en" | "ja";
}

export default function ApprovalsTab({ language }: ApprovalsTabProps) {
  const t = assetTranslations[language];
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

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
      const params = new URLSearchParams({ all: "true" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(
        `/api/general-affairs/reservations?${params.toString()}`,
      );
      if (res.ok) {
        setReservations(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(
        `/api/general-affairs/reservations/${id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        },
      );
      if (res.ok) fetchReservations();
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt(t.rejectReason);
    if (reason === null) return;
    setProcessing(id);
    try {
      const res = await fetch(
        `/api/general-affairs/reservations/${id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject", reason }),
        },
      );
      if (res.ok) fetchReservations();
    } finally {
      setProcessing(null);
    }
  };

  const handleReturn = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(
        `/api/general-affairs/reservations/${id}/return`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (res.ok) fetchReservations();
    } finally {
      setProcessing(null);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(language === "ja" ? "ja-JP" : "en-US", {
      month: "short",
      day: "numeric",
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {statusFilter === "PENDING"
            ? t.pendingApprovals
            : t.allReservations}
        </h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">{t.allReservations}</option>
          <option value="PENDING">{t.statusPending}</option>
          <option value="CONFIRMED">{t.statusConfirmed}</option>
          <option value="CANCELLED">{t.statusCancelled}</option>
          <option value="RETURNED">{t.statusReturned}</option>
        </select>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {statusFilter === "PENDING"
            ? t.noPendingApprovals
            : t.noData}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2">{t.applicant}</th>
                <th className="text-left px-4 py-2">{t.resource}</th>
                <th className="text-left px-4 py-2">{t.dateTime}</th>
                <th className="text-left px-4 py-2">{t.purpose}</th>
                <th className="text-center px-4 py-2">{t.status}</th>
                <th className="text-center px-4 py-2">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((rv) => (
                <tr key={rv.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium">{rv.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {rv.user.email}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      {rv.resource.category.color && (
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: rv.resource.category.color,
                          }}
                        />
                      )}
                      <span>
                        {language === "ja"
                          ? rv.resource.name
                          : rv.resource.nameEn || rv.resource.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    <div>{formatDateTime(rv.startTime)}</div>
                    <div className="text-xs">
                      ~ {formatDateTime(rv.endTime)}
                    </div>
                  </td>
                  <td className="px-4 py-2">{rv.title}</td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[rv.status] || ""}`}
                    >
                      {statusLabels[rv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {rv.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(rv.id)}
                            disabled={processing === rv.id}
                          >
                            {processing === rv.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            )}
                            {t.approve}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(rv.id)}
                            disabled={processing === rv.id}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            {t.reject}
                          </Button>
                        </>
                      )}
                      {rv.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => handleReturn(rv.id)}
                          disabled={processing === rv.id}
                        >
                          {processing === rv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3 mr-1" />
                          )}
                          {t.returnItem}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
