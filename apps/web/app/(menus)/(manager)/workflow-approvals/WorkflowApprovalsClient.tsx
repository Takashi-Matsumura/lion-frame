"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { workflowApprovalsTranslations, type Language } from "./translations";

type ApprovalStatus = "pending" | "approved" | "rejected";
type RequestType = "leave" | "expense" | "purchase" | "sickLeave";

interface MockApprovalRequest {
  id: string;
  requester: string;
  title: string;
  type: RequestType;
  status: ApprovalStatus;
  submittedAt: string;
  decidedAt?: string;
}

const initialPending: MockApprovalRequest[] = [
  {
    id: "WF-001",
    requester: "Yamada Ichiro",
    title: "Annual Leave - March 10-14",
    type: "leave",
    submittedAt: "2026-02-28",
    status: "pending",
  },
  {
    id: "WF-005",
    requester: "Sato Yuki",
    title: "Conference Travel Expense",
    type: "expense",
    submittedAt: "2026-02-27",
    status: "pending",
  },
];

const initialHistory: MockApprovalRequest[] = [
  {
    id: "WF-002",
    requester: "Yamada Ichiro",
    title: "Client Dinner Expense",
    type: "expense",
    submittedAt: "2026-02-25",
    status: "approved",
    decidedAt: "2026-02-26",
  },
];

const statusStyles: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

interface WorkflowApprovalsClientProps {
  language: Language;
}

export function WorkflowApprovalsClient({ language }: WorkflowApprovalsClientProps) {
  const t = workflowApprovalsTranslations[language];
  const [pending, setPending] = useState<MockApprovalRequest[]>(initialPending);
  const [history, setHistory] = useState<MockApprovalRequest[]>(initialHistory);

  const typeLabels: Record<RequestType, string> = {
    leave: t.typeLeave,
    expense: t.typeExpense,
    purchase: t.typePurchase,
    sickLeave: t.typeSickLeave,
  };

  const statusLabels: Record<ApprovalStatus, string> = {
    pending: t.statusPending,
    approved: t.statusApproved,
    rejected: t.statusRejected,
  };

  const handleDecision = (id: string, decision: "approved" | "rejected") => {
    const request = pending.find((r) => r.id === id);
    if (!request) return;

    const decided: MockApprovalRequest = {
      ...request,
      status: decision,
      decidedAt: new Date().toISOString().split("T")[0],
    };

    setPending((prev) => prev.filter((r) => r.id !== id));
    setHistory((prev) => [decided, ...prev]);

    if (decision === "approved") {
      toast.success(t.approvedToast);
    } else {
      toast.info(t.rejectedToast);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mock notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        {t.mockNotice}
      </div>

      <p className="text-sm text-muted-foreground">{t.subtitle}</p>

      {/* Pending Approvals */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t.pendingSection}</h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                {t.noPending}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.noPendingDescription}
              </p>
            </CardContent>
          </Card>
        ) : (
          pending.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <span className="mr-2 text-sm text-muted-foreground">
                        {request.id}
                      </span>
                      {request.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t.headerRequester}: {request.requester} ·{" "}
                      {typeLabels[request.type]} · {request.submittedAt}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles.pending}`}
                  >
                    {statusLabels.pending}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecision(request.id, "rejected")}
                  >
                    {t.reject}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDecision(request.id, "approved")}
                  >
                    {t.approve}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Approval History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t.historySection}</h2>
        {history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">{t.noHistory}</p>
            </CardContent>
          </Card>
        ) : (
          history.map((request) => (
            <Card key={request.id} className="opacity-80">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <span className="mr-2 text-sm text-muted-foreground">
                        {request.id}
                      </span>
                      {request.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t.headerRequester}: {request.requester} ·{" "}
                      {typeLabels[request.type]} · {request.submittedAt}
                      {request.decidedAt &&
                        ` · ${t.headerDecidedAt}: ${request.decidedAt}`}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[request.status]}`}
                  >
                    {statusLabels[request.status]}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
