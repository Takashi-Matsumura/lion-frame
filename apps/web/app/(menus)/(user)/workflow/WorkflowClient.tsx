"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { workflowTranslations, type Language } from "./translations";

type RequestStatus = "draft" | "pending" | "approved" | "rejected";

interface MockRequest {
  id: string;
  title: string;
  type: "leave" | "expense" | "purchase" | "sickLeave";
  status: RequestStatus;
  submittedAt: string;
  approver: string;
}

const mockRequests: MockRequest[] = [
  {
    id: "WF-001",
    title: "Annual Leave - March 10-14",
    type: "leave",
    status: "pending",
    submittedAt: "2026-02-28",
    approver: "Tanaka Taro",
  },
  {
    id: "WF-002",
    title: "Client Dinner Expense",
    type: "expense",
    status: "approved",
    submittedAt: "2026-02-25",
    approver: "Suzuki Hanako",
  },
  {
    id: "WF-003",
    title: "Office Supplies Purchase",
    type: "purchase",
    status: "draft",
    submittedAt: "",
    approver: "",
  },
  {
    id: "WF-004",
    title: "Sick Leave - February 20",
    type: "sickLeave",
    status: "rejected",
    submittedAt: "2026-02-20",
    approver: "Tanaka Taro",
  },
];

const statusStyles: Record<RequestStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

interface WorkflowClientProps {
  language: Language;
}

export function WorkflowClient({ language }: WorkflowClientProps) {
  const t = workflowTranslations[language];
  const [activeFilter, setActiveFilter] = useState<RequestStatus | "all">("all");

  const typeLabels: Record<MockRequest["type"], string> = {
    leave: t.typeLeave,
    expense: t.typeExpense,
    purchase: t.typePurchase,
    sickLeave: t.typeSickLeave,
  };

  const statusLabels: Record<RequestStatus, string> = {
    draft: t.statusDraft,
    pending: t.statusPending,
    approved: t.statusApproved,
    rejected: t.statusRejected,
  };

  const filters: { key: RequestStatus | "all"; label: string }[] = [
    { key: "all", label: t.filterAll },
    { key: "draft", label: t.filterDraft },
    { key: "pending", label: t.filterPending },
    { key: "approved", label: t.filterApproved },
    { key: "rejected", label: t.filterRejected },
  ];

  const filteredRequests =
    activeFilter === "all"
      ? mockRequests
      : mockRequests.filter((r) => r.status === activeFilter);

  return (
    <div className="space-y-6">
      {/* Mock notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        {t.mockNotice}
      </div>

      {/* Header with New Request button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        <Button onClick={() => toast.info(t.newRequestToast)}>
          {t.newRequest}
        </Button>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={activeFilter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Request list */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              {t.noRequests}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.noRequestsDescription}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
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
                      {typeLabels[request.type]}
                      {request.submittedAt && ` · ${request.submittedAt}`}
                      {request.approver &&
                        ` · ${t.headerApprover}: ${request.approver}`}
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
          ))}
        </div>
      )}
    </div>
  );
}
