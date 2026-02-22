"use client";

import { useCallback, useEffect, useState } from "react";
import { requestTranslations } from "../translations";
import RequestDetail from "./RequestDetail";

interface WorkflowStep {
  id: string;
  order: number;
  status: string;
  comment: string | null;
  actedAt: string | null;
  assignee: { id: string; name: string | null } | null;
  templateStep: { name: string; nameJa: string; stepType: string };
}

interface WorkflowRequest {
  id: string;
  title: string;
  status: string;
  formData: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
  template: { name: string; nameJa: string; category: string };
  steps: WorkflowStep[];
}

interface MyRequestsProps {
  language: "en" | "ja";
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function MyRequests({ language }: MyRequestsProps) {
  const t = requestTranslations[language];
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusLabel = useCallback(
    (status: string) => {
      const map: Record<string, string> = {
        DRAFT: t.statusDraft,
        PENDING: t.statusPending,
        IN_PROGRESS: t.statusInProgress,
        APPROVED: t.statusApproved,
        REJECTED: t.statusRejected,
        CANCELLED: t.statusCancelled,
      };
      return map[status] || status;
    },
    [t],
  );

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/workflow/requests");
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCancel = async (id: string) => {
    if (!confirm(t.cancelConfirm)) return;
    try {
      const res = await fetch(`/api/workflow/requests/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (selectedId) {
    return (
      <RequestDetail
        language={language}
        instanceId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">{t.noRequests}</p>
        <p className="text-sm mt-1">{t.noRequestsDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{req.title}</h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || ""}`}
                >
                  {statusLabel(req.status)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "ja"
                  ? req.template.nameJa
                  : req.template.name}{" "}
                &middot;{" "}
                {new Date(req.createdAt).toLocaleDateString(
                  language === "ja" ? "ja-JP" : "en-US",
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                type="button"
                onClick={() => setSelectedId(req.id)}
                className="text-xs text-primary hover:underline"
              >
                {t.detail}
              </button>
              {(req.status === "PENDING" || req.status === "IN_PROGRESS") && (
                <button
                  type="button"
                  onClick={() => handleCancel(req.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
