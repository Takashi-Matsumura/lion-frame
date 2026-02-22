"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { approvalTranslations } from "../translations";

interface ApprovalDialogProps {
  language: "en" | "ja";
  approval: {
    id: string;
    instance: {
      id: string;
      title: string;
      formData: Record<string, string | undefined>;
      createdAt: string;
      template: { name: string; nameJa: string; category: string };
      requester: { id: string; name: string | null; email: string | null };
    };
    templateStep: { name: string; nameJa: string; stepType: string };
  };
  onClose: () => void;
  onProcessed: () => void;
}

export default function ApprovalDialog({
  language,
  approval,
  onClose,
  onProcessed,
}: ApprovalDialogProps) {
  const t = approvalTranslations[language];
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const formData = approval.instance.formData;
  const isLeave = approval.instance.template.category === "LEAVE";

  const handleAction = async (action: "APPROVED" | "REJECTED") => {
    setProcessing(true);
    setError("");

    try {
      const res = await fetch(`/api/workflow/approvals/${approval.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.error);
      }

      onProcessed();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.approvalDialog}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
          >
            &times;
          </button>
        </div>

        {/* Request info */}
        <div className="space-y-2">
          <h3 className="font-medium">{approval.instance.title}</h3>
          <p className="text-sm text-muted-foreground">
            {t.requester}:{" "}
            {approval.instance.requester.name ||
              approval.instance.requester.email}
          </p>
          <p className="text-sm text-muted-foreground">
            {t.requestDate}:{" "}
            {new Date(approval.instance.createdAt).toLocaleDateString(
              language === "ja" ? "ja-JP" : "en-US",
            )}
          </p>
        </div>

        {/* Leave details */}
        {isLeave && formData && (
          <div className="border rounded-lg p-3 space-y-1 bg-muted/30">
            {formData.leaveTypeName && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t.leaveType}: </span>
                {String(formData.leaveTypeName)}
              </p>
            )}
            {formData.startDate && formData.endDate && (
              <p className="text-sm">
                <span className="text-muted-foreground">
                  {t.leavePeriod}:{" "}
                </span>
                {String(formData.startDate)} ~ {String(formData.endDate)}
              </p>
            )}
            {formData.reason && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t.reason}: </span>
                {String(formData.reason)}
              </p>
            )}
          </div>
        )}

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium mb-1">{t.comment}</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.commentPlaceholder}
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("REJECTED")}
            disabled={processing}
          >
            {t.reject}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleAction("APPROVED")}
            disabled={processing}
          >
            {processing ? t.processing : t.approve}
          </Button>
        </div>
      </div>
    </div>
  );
}
