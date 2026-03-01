"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  RiUserReceivedLine,
  RiShieldCheckLine,
  RiBellLine,
} from "react-icons/ri";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { LoadingSpinner } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { workflowApprovalsTranslations, type Language } from "./translations";
import { ApprovalDetailDialog } from "./ApprovalDetailDialog";

// ─── Types ───

type ApprovalStatus = "pending" | "approved" | "rejected";

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

interface HistoryItem {
  id: string;
  step: number;
  status: string;
  comment: string | null;
  decidedAt: string | null;
  approver: { id: string; name: string };
  decidedBy: { id: string; name: string } | null;
  request: {
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
  };
}

// ─── Styles ───

const statusStyles: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

// ─── Component ───

interface WorkflowApprovalsClientProps {
  language: Language;
}

export function WorkflowApprovalsClient({ language }: WorkflowApprovalsClientProps) {
  const t = workflowApprovalsTranslations[language];
  const [pending, setPending] = useState<WorkflowRequest[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIsPending, setDetailIsPending] = useState(false);

  const typeLabels: Record<string, string> = {
    leave: t.typeLeave,
    expense: t.typeExpense,
    purchase: t.typePurchase,
    overtime: t.typeOvertime,
  };

  const statusLabels: Record<string, string> = {
    pending: t.statusPending,
    approved: t.statusApproved,
    rejected: t.statusRejected,
  };

  const fetchData = useCallback(async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        fetch("/api/workflow/approvals"),
        fetch("/api/workflow/approvals/history"),
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPending(data.requests || []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.history || []);
      }
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePendingClick = useCallback((request: WorkflowRequest) => {
    setSelectedRequest(request);
    setDetailIsPending(true);
    setDetailOpen(true);
  }, []);

  const handleHistoryClick = useCallback((item: HistoryItem) => {
    const request: WorkflowRequest = {
      ...item.request,
      approvals: [{
        id: item.id,
        step: item.step,
        status: item.status,
        comment: item.comment,
        decidedAt: item.decidedAt,
        approver: item.approver,
        decidedBy: item.decidedBy,
      }],
    };
    setSelectedRequest(request);
    setDetailIsPending(false);
    setDetailOpen(true);
  }, []);

  const handleQuickApprove = useCallback(async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/workflow/approvals/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      toast.success(t.approvedToast);
      fetchData();
    } catch {
      toast.error(t.approveError);
    }
  }, [t, fetchData]);

  const handleQuickReject = useCallback(async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/workflow/approvals/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      toast.info(t.rejectedToast);
      fetchData();
    } catch {
      toast.error(t.rejectError);
    }
  }, [t, fetchData]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(language === "ja" ? "ja-JP" : "en-US");
  };

  // Feature highlight data
  const features = [
    { icon: RiUserReceivedLine, title: t.featureDeputyTitle, desc: t.featureDeputyDesc },
    { icon: RiShieldCheckLine, title: t.featureAuditTitle, desc: t.featureAuditDesc },
    { icon: RiBellLine, title: t.featureNotifyTitle, desc: t.featureNotifyDesc },
  ];

  // Demo pending items
  const demoPending = [
    {
      title: t.demoExpenseTitle,
      requester: t.demoExpenseRequester,
      dept: t.demoExpenseDept,
      type: "expense",
      step: t.demoExpenseStep,
      date: "2026-02-25",
    },
    {
      title: t.demoLeaveTitle,
      requester: t.demoLeaveRequester,
      dept: t.demoLeaveDept,
      type: "leave",
      step: t.demoLeaveStep,
      date: "2026-02-27",
    },
  ];

  // Demo history items
  const demoHistory: { title: string; status: ApprovalStatus; comment: string | null; isDeputy: boolean; date: string; type: string }[] = [
    {
      title: t.demoHistApprovedTitle,
      status: "approved",
      comment: t.demoHistApprovedComment,
      isDeputy: false,
      date: "2026-02-20",
      type: "purchase",
    },
    {
      title: t.demoHistDeputyTitle,
      status: "approved",
      comment: null,
      isDeputy: true,
      date: "2026-02-18",
      type: "overtime",
    },
    {
      title: t.demoHistRejectedTitle,
      status: "rejected",
      comment: t.demoHistRejectedComment,
      isDeputy: false,
      date: "2026-02-15",
      type: "purchase",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.subtitle}</p>

      {/* Approval Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.flowTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop: horizontal layout */}
          <div className="hidden md:block">
            {/* Main flow row */}
            <div className="flex items-center gap-3">
              {/* Submit */}
              <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-3 text-center min-w-[100px] dark:bg-blue-950/30">
                <p className="text-sm font-semibold">{t.flowSubmit}</p>
              </div>
              <span className="text-xl text-muted-foreground">&rarr;</span>
              {/* Step 1 column */}
              <div className="flex flex-col items-center gap-1">
                <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-3 text-center min-w-[100px] dark:bg-yellow-950/30">
                  <p className="text-sm font-semibold">{t.flowStep1}</p>
                </div>
                <span className="text-lg text-red-400">&darr;</span>
                <div className="rounded-lg border-2 border-dashed border-red-300 bg-red-50/50 px-3 py-1.5 text-center dark:bg-red-950/20">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">{t.flowReject}</p>
                </div>
              </div>
              <span className="text-xl text-muted-foreground">&rarr;</span>
              {/* Step 2 column */}
              <div className="flex flex-col items-center gap-1">
                <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-3 text-center min-w-[100px] dark:bg-yellow-950/30">
                  <p className="text-sm font-semibold">{t.flowStep2}</p>
                </div>
                <span className="text-lg text-red-400">&darr;</span>
                <div className="rounded-lg border-2 border-dashed border-red-300 bg-red-50/50 px-3 py-1.5 text-center dark:bg-red-950/20">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">{t.flowReject}</p>
                </div>
              </div>
              <span className="text-xl text-muted-foreground">&rarr;</span>
              {/* Complete */}
              <div className="rounded-xl border-2 border-green-400 bg-green-50 p-3 text-center min-w-[100px] dark:bg-green-950/30">
                <p className="text-sm font-semibold">{t.flowComplete}</p>
              </div>
            </div>
          </div>

          {/* Mobile: vertical layout */}
          <div className="flex flex-col items-center gap-2 md:hidden">
            {/* Submit */}
            <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-3 text-center min-w-[140px] dark:bg-blue-950/30">
              <p className="text-sm font-semibold">{t.flowSubmit}</p>
            </div>
            <span className="text-xl text-muted-foreground">&darr;</span>
            {/* Step 1 + reject */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-3 text-center min-w-[140px] dark:bg-yellow-950/30">
                <p className="text-sm font-semibold">{t.flowStep1}</p>
              </div>
              <span className="text-lg text-red-400">&rarr;</span>
              <div className="rounded-lg border-2 border-dashed border-red-300 bg-red-50/50 px-3 py-1.5 dark:bg-red-950/20">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">{t.flowReject}</p>
              </div>
            </div>
            <span className="text-xl text-muted-foreground">&darr;</span>
            {/* Step 2 + reject */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-3 text-center min-w-[140px] dark:bg-yellow-950/30">
                <p className="text-sm font-semibold">{t.flowStep2}</p>
              </div>
              <span className="text-lg text-red-400">&rarr;</span>
              <div className="rounded-lg border-2 border-dashed border-red-300 bg-red-50/50 px-3 py-1.5 dark:bg-red-950/20">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">{t.flowReject}</p>
              </div>
            </div>
            <span className="text-xl text-muted-foreground">&darr;</span>
            {/* Complete */}
            <div className="rounded-xl border-2 border-green-400 bg-green-50 p-3 text-center min-w-[140px] dark:bg-green-950/30">
              <p className="text-sm font-semibold">{t.flowComplete}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="py-4">
              <f.icon className="mb-2 h-6 w-6 text-primary" />
              <p className="font-semibold">{f.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Demo Pending Approvals */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t.demoPendingTitle}</h2>
        {demoPending.map((dp, i) => (
          <div key={i} className="relative rounded-lg border-2 border-dashed p-1">
            <Badge variant="outline" className="absolute right-2 top-2 z-10 text-xs">
              DEMO
            </Badge>
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between pr-16">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <span className="mr-2 text-sm text-muted-foreground">
                        WF-DEMO-{String(i + 1).padStart(4, "0")}
                      </span>
                      {dp.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t.headerRequester}: {dp.requester}
                      {` (${dp.dept})`}
                      {" · "}
                      {typeLabels[dp.type] || dp.type}
                      {" · "}
                      {formatDate(dp.date)}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {dp.step}
                    </Badge>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles.pending}`}>
                    {statusLabels.pending}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" disabled>
                    {t.reject}
                  </Button>
                  <Button size="sm" disabled>
                    {t.approve}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Demo History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t.demoHistoryTitle}</h2>
        {demoHistory.map((dh, i) => (
          <div key={i} className="relative rounded-lg border-2 border-dashed p-1">
            <Badge variant="outline" className="absolute right-2 top-2 z-10 text-xs">
              DEMO
            </Badge>
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between pr-16">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <span className="mr-2 text-sm text-muted-foreground">
                        WF-DEMO-{String(i + 10).padStart(4, "0")}
                      </span>
                      {dh.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {typeLabels[dh.type] || dh.type}
                      {" · "}
                      {formatDate(dh.date)}
                      {dh.isDeputy && (
                        <> · <Badge variant="outline" className="text-xs">{t.deputyLabel}</Badge></>
                      )}
                    </p>
                    {dh.comment && (
                      <p className="text-xs text-muted-foreground">
                        {t.comment}: {dh.comment}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[dh.status]}`}
                  >
                    {statusLabels[dh.status] || dh.status}
                  </span>
                </div>
              </CardHeader>
            </Card>
          </div>
        ))}
      </div>

      <Separator />

      {/* Real Pending Approvals */}
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
            <Card
              key={request.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => handlePendingClick(request)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <span className="mr-2 text-sm text-muted-foreground">
                        {request.requestNumber}
                      </span>
                      {request.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t.headerRequester}: {request.requester.name}
                      {request.requester.department && ` (${request.requester.department.name})`}
                      {" · "}
                      {typeLabels[request.template.type] || request.template.type}
                      {" · "}
                      {formatDate(request.submittedAt)}
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
                    onClick={(e) => handleQuickReject(e, request.id)}
                  >
                    {t.reject}
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => handleQuickApprove(e, request.id)}
                  >
                    {t.approve}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Real Approval History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t.historySection}</h2>
        {history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">{t.noHistory}</p>
            </CardContent>
          </Card>
        ) : (
          history.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer opacity-80 transition-colors hover:bg-muted/50"
              onClick={() => handleHistoryClick(item)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <span className="mr-2 text-sm text-muted-foreground">
                        {item.request.requestNumber}
                      </span>
                      {item.request.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t.headerRequester}: {item.request.requester.name}
                      {" · "}
                      {typeLabels[item.request.template.type] || item.request.template.type}
                      {" · "}
                      {formatDate(item.request.submittedAt)}
                      {item.decidedAt && ` · ${t.headerDecidedAt}: ${formatDate(item.decidedAt)}`}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status as ApprovalStatus] || ""}`}
                  >
                    {statusLabels[item.status as ApprovalStatus] || item.status}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <ApprovalDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={selectedRequest}
        language={language}
        onDecided={fetchData}
        isPending={detailIsPending}
      />
    </div>
  );
}
