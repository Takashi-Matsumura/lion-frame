"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { requestTranslations } from "../translations";

interface StepDetail {
  id: string;
  order: number;
  status: string;
  comment: string | null;
  actedAt: string | null;
  assignee: { id: string; name: string | null } | null;
  templateStep: { name: string; nameJa: string; stepType: string };
}

interface RequestDetailData {
  id: string;
  title: string;
  status: string;
  formData: Record<string, string | undefined>;
  createdAt: string;
  completedAt: string | null;
  template: { name: string; nameJa: string; category: string };
  requester: { id: string; name: string | null; email: string | null };
  steps: StepDetail[];
}

interface RequestDetailProps {
  language: "en" | "ja";
  instanceId: string;
  onClose: () => void;
}

const stepStatusIcons: Record<string, { icon: string; color: string }> = {
  WAITING: { icon: "\u25CB", color: "text-gray-400" },
  PENDING: { icon: "\u25CF", color: "text-yellow-500" },
  APPROVED: { icon: "\u2713", color: "text-green-600" },
  REJECTED: { icon: "\u2717", color: "text-red-600" },
  SKIPPED: { icon: "\u2014", color: "text-gray-400" },
};

export default function RequestDetail({
  language,
  instanceId,
  onClose,
}: RequestDetailProps) {
  const t = requestTranslations[language];
  const [detail, setDetail] = useState<RequestDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflow/requests/${instanceId}`);
      if (res.ok) {
        setDetail(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: t.statusDraft,
      PENDING: t.statusPending,
      IN_PROGRESS: t.statusInProgress,
      APPROVED: t.statusApproved,
      REJECTED: t.statusRejected,
      CANCELLED: t.statusCancelled,
      WAITING: t.waiting,
      SKIPPED: t.skipped,
    };
    return map[status] || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Not found</p>
        <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
          {t.close}
        </Button>
      </div>
    );
  }

  const formData = detail.formData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t.requestDetail}</h2>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t.close}
        </Button>
      </div>

      {/* Request info */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{detail.title}</h3>
          <span className="text-sm text-muted-foreground">
            {statusLabel(detail.status)}
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          {t.requester}: {detail.requester.name || detail.requester.email}
        </div>

        <div className="text-sm text-muted-foreground">
          {t.requestDate}:{" "}
          {new Date(detail.createdAt).toLocaleDateString(
            language === "ja" ? "ja-JP" : "en-US",
          )}
        </div>

        {/* Leave-specific details */}
        {detail.template.category === "LEAVE" && formData && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {formData.leaveTypeName && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t.leaveType}: </span>
                {String(formData.leaveTypeName)}
              </div>
            )}
            {formData.startDate && formData.endDate && (
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {t.leavePeriod}:{" "}
                </span>
                {String(formData.startDate)} ~ {String(formData.endDate)}
              </div>
            )}
            {formData.reason && (
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {t.leaveReason}:{" "}
                </span>
                {String(formData.reason)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval progress */}
      <div>
        <h3 className="font-medium mb-3">{t.approvalProgress}</h3>
        <div className="space-y-2">
          {detail.steps.map((step) => {
            const iconInfo = stepStatusIcons[step.status] || {
              icon: "?",
              color: "text-gray-400",
            };
            return (
              <div
                key={step.id}
                className="flex items-start gap-3 border rounded-lg p-3"
              >
                <span className={`text-lg ${iconInfo.color} mt-0.5`}>
                  {iconInfo.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {language === "ja"
                        ? step.templateStep.nameJa
                        : step.templateStep.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {statusLabel(step.status)}
                    </span>
                  </div>
                  {step.assignee && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.approver}: {step.assignee.name || "—"}
                    </p>
                  )}
                  {step.comment && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      {t.comment}: {step.comment}
                    </p>
                  )}
                  {step.actedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(step.actedAt).toLocaleString(
                        language === "ja" ? "ja-JP" : "en-US",
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
