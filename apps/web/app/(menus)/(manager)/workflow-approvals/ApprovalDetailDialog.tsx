"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkflowFormDisplay } from "@/app/(menus)/(user)/workflow/WorkflowFormFields";
import { workflowApprovalsTranslations, type Language } from "./translations";

interface Approval {
  id: string;
  step: number;
  status: string;
  comment: string | null;
  decidedAt: string | null;
  approver: { id: string; name: string };
  decidedBy: { id: string; name: string } | null;
}

interface WorkflowRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  formData: Record<string, unknown>;
  submittedAt: string | null;
  template: {
    type: string;
    name: string;
    nameJa: string;
    formSchema: { fields: Array<{ name: string; type: string; label: string; labelJa: string; required: boolean; options?: Array<{ value: string; label: string; labelJa: string }> }> };
  };
  requester: {
    id: string;
    name: string;
    email: string | null;
    department: { name: string } | null;
  };
  approvals: Approval[];
}

interface ApprovalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: WorkflowRequest | null;
  language: Language;
  onDecided: () => void;
  isPending: boolean;
}

const stepStatusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  skipped: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function ApprovalDetailDialog({
  open,
  onOpenChange,
  request,
  language,
  onDecided,
  isPending,
}: ApprovalDetailDialogProps) {
  const t = workflowApprovalsTranslations[language];
  const [comment, setComment] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const typeLabels: Record<string, string> = {
    leave: t.typeLeave,
    expense: t.typeExpense,
    purchase: t.typePurchase,
    overtime: t.typeOvertime,
  };

  const stepStatusLabels: Record<string, string> = {
    pending: t.stepPending,
    approved: t.stepApproved,
    rejected: t.stepRejected,
    skipped: t.stepSkipped,
  };

  const handleApprove = useCallback(async () => {
    if (!request) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/workflow/approvals/${request.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.approvedToast);
      setComment("");
      onOpenChange(false);
      onDecided();
    } catch {
      toast.error(t.approveError);
    } finally {
      setApproving(false);
    }
  }, [request, comment, t, onOpenChange, onDecided]);

  const handleReject = useCallback(async () => {
    if (!request) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/workflow/approvals/${request.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.info(t.rejectedToast);
      setComment("");
      onOpenChange(false);
      onDecided();
    } catch {
      toast.error(t.rejectError);
    } finally {
      setRejecting(false);
    }
  }, [request, comment, t, onOpenChange, onDecided]);

  if (!request) return null;

  const isLoading = approving || rejecting;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(language === "ja" ? "ja-JP" : "en-US");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.detailTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Basic info */}
          <div className="space-y-2">
            <InfoRow label={t.requestNumber} value={request.requestNumber} />
            <InfoRow label={t.headerTitle} value={request.title} />
            <InfoRow
              label={t.templateType}
              value={typeLabels[request.template.type] || request.template.type}
            />
            <InfoRow label={t.requester} value={request.requester.name} />
            {request.requester.department && (
              <InfoRow label={t.department} value={request.requester.department.name} />
            )}
            <InfoRow label={t.submittedAt} value={formatDate(request.submittedAt)} />
          </div>

          {/* Form data */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              {t.formData}
            </h3>
            <div className="rounded-lg border p-3">
              <WorkflowFormDisplay
                schema={request.template.formSchema}
                language={language}
                values={request.formData}
              />
            </div>
          </div>

          {/* Approval progress */}
          {request.approvals.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {t.approvalProgress}
              </h3>
              <div className="space-y-2">
                {request.approvals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {t.stepLabel} {approval.step}: {approval.approver.name}
                      </div>
                      {approval.decidedBy && approval.decidedBy.id !== approval.approver.id && (
                        <div className="text-xs text-muted-foreground">
                          {approval.decidedBy.name} {t.deputyLabel}
                        </div>
                      )}
                      {approval.comment && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t.comment}: {approval.comment}
                        </div>
                      )}
                      {approval.decidedAt && (
                        <div className="text-xs text-muted-foreground">
                          {formatDate(approval.decidedAt)}
                        </div>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stepStatusStyles[approval.status] || ""}`}
                    >
                      {stepStatusLabels[approval.status] || approval.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comment + Actions for pending */}
          {isPending && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="approval-comment" className="block text-sm font-medium text-foreground">
                  {t.comment}
                </label>
                <textarea
                  id="approval-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  disabled={isLoading}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isLoading}
                >
                  {rejecting ? t.rejecting : t.reject}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isLoading}
                >
                  {approving ? t.approving : t.approve}
                </Button>
              </div>
            </div>
          )}

          {!isPending && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t.close}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
