"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  RiFileListLine,
  RiFlowChart,
  RiUserReceivedLine,
  RiShieldCheckLine,
} from "react-icons/ri";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { LoadingSpinner } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { workflowTranslations, type Language } from "./translations";
import { NewRequestDialog } from "./NewRequestDialog";
import { RequestDetailDialog } from "./RequestDetailDialog";

// ─── Types ───

type RequestStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled";

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
  completedAt: string | null;
  createdAt: string;
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

interface Template {
  id: string;
  type: string;
  name: string;
  nameJa: string;
  description: string | null;
  descriptionJa: string | null;
  approvalSteps: number;
  formSchema: { fields: Array<{ name: string; type: string; label: string; labelJa: string; required: boolean; options?: Array<{ value: string; label: string; labelJa: string }> }> };
}

interface ChainNode {
  name: string;
  position: string;
  department: string;
  deputyName: string | null;
}

interface DemoTemplate {
  id: string;
  type: string;
  name: string;
  nameJa: string;
  description: string | null;
  descriptionJa: string | null;
  approvalSteps: number;
  fieldCount: number;
}

interface DemoInfo {
  employee: { name: string; position: string; department: string; section: string | null } | null;
  approvalChain: ChainNode[];
  sampleChain: ChainNode[] | null;
  templates: DemoTemplate[];
  stats: { employees: number; supervisorSet: number; deputySet: number; templates: number };
}

// ─── Styles ───

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

// ─── Component ───

interface WorkflowClientProps {
  language: Language;
}

export function WorkflowClient({ language }: WorkflowClientProps) {
  const t = workflowTranslations[language];
  const [activeFilter, setActiveFilter] = useState<RequestStatus | "all">("all");
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [demoInfo, setDemoInfo] = useState<DemoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const typeLabels: Record<string, string> = {
    leave: t.typeLeave,
    expense: t.typeExpense,
    purchase: t.typePurchase,
    overtime: t.typeOvertime,
  };

  const statusLabels: Record<string, string> = {
    draft: t.statusDraft,
    pending: t.statusPending,
    approved: t.statusApproved,
    rejected: t.statusRejected,
    cancelled: t.statusCancelled,
  };

  const filters: { key: RequestStatus | "all"; label: string }[] = [
    { key: "all", label: t.filterAll },
    { key: "draft", label: t.filterDraft },
    { key: "pending", label: t.filterPending },
    { key: "approved", label: t.filterApproved },
    { key: "rejected", label: t.filterRejected },
    { key: "cancelled", label: t.filterCancelled },
  ];

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, tmplRes, demoRes] = await Promise.all([
        fetch("/api/workflow/requests"),
        fetch("/api/workflow/templates"),
        fetch("/api/workflow/demo-info"),
      ]);

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests || []);
      }
      if (tmplRes.ok) {
        const data = await tmplRes.json();
        setTemplates(data.templates || []);
      }
      if (demoRes.ok) {
        const data = await demoRes.json();
        setDemoInfo(data);
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

  const filteredRequests =
    activeFilter === "all"
      ? requests
      : requests.filter((r) => r.status === activeFilter);

  const handleCardClick = useCallback((request: WorkflowRequest) => {
    setSelectedRequest(request);
    setDetailOpen(true);
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(language === "ja" ? "ja-JP" : "en-US");
  };

  const fmt = (template: string, vars: Record<string, string | number>) => {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(`{${key}}`, String(value));
    }
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const stats = demoInfo?.stats;
  const chain = demoInfo?.approvalChain?.length
    ? demoInfo.approvalChain
    : null;
  const sampleChain = demoInfo?.sampleChain ?? null;
  const displayChain = chain ?? (sampleChain ? sampleChain.slice(1) : null);
  const isSampleChain = !chain && !!sampleChain;
  const startNode = chain
    ? demoInfo?.employee
    : sampleChain?.[0] ?? null;

  // Feature highlight data
  const features = [
    { icon: RiFileListLine, title: t.featureTemplatesTitle, desc: t.featureTemplatesDesc },
    { icon: RiFlowChart, title: t.featureMultiStepTitle, desc: t.featureMultiStepDesc },
    { icon: RiUserReceivedLine, title: t.featureDeputyTitle, desc: t.featureDeputyDesc },
    { icon: RiShieldCheckLine, title: t.featureAuditTitle, desc: t.featureAuditDesc },
  ];

  // Demo request data
  const demoRequests: { title: string; status: string; type: string; date: string; approvers?: string; comment?: string }[] = [
    { title: t.demoRequestDraftTitle, status: "draft", type: "purchase", date: "2026-02-28" },
    { title: t.demoRequestPendingTitle, status: "pending", type: "expense", date: "2026-02-25", approvers: language === "ja" ? "佐藤課長" : "Manager Sato" },
    { title: t.demoRequestApprovedTitle, status: "approved", type: "leave", date: "2026-02-20" },
    { title: t.demoRequestRejectedTitle, status: "rejected", type: "purchase", date: "2026-02-18", comment: t.demoRejectedComment },
    { title: t.demoRequestCancelledTitle, status: "cancelled", type: "overtime", date: "2026-02-15" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        <Button onClick={() => setNewDialogOpen(true)}>
          {t.newRequest}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: t.statsEmployees, value: stats.employees },
            { label: t.statsSupervisorSet, value: stats.supervisorSet },
            { label: t.statsDeputySet, value: stats.deputySet },
            { label: t.statsTemplates, value: stats.templates },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Approval Chain Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.chainTitle}</CardTitle>
          {isSampleChain && (
            <p className="text-xs text-muted-foreground">{t.chainSampleNote}</p>
          )}
        </CardHeader>
        <CardContent>
          {displayChain && displayChain.length > 0 ? (
            <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
              {/* Start node (You / Sample employee) */}
              {startNode && (
                <>
                  <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-center min-w-[140px]">
                    <p className="font-semibold">{isSampleChain ? startNode.name : t.chainYou}</p>
                    <p className="text-xs text-muted-foreground">{startNode.position}</p>
                    <p className="text-xs text-muted-foreground">{startNode.department}</p>
                  </div>
                  {/* Arrow */}
                  <span className="hidden text-xl text-muted-foreground md:block">&rarr;</span>
                  <span className="block text-xl text-muted-foreground md:hidden">&darr;</span>
                </>
              )}
              {/* Chain nodes */}
              {displayChain.map((node, i) => (
                <div key={i} className="contents">
                  <div className="rounded-xl border-2 border-border p-4 text-center min-w-[140px]">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t.stepLabel} {i + 1}
                    </p>
                    <p className="font-semibold">{node.name}</p>
                    <p className="text-xs text-muted-foreground">{node.position}</p>
                    <p className="text-xs text-muted-foreground">{node.department}</p>
                    {node.deputyName && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {t.chainDeputy}: {node.deputyName}
                      </Badge>
                    )}
                  </div>
                  {i < displayChain.length - 1 && (
                    <>
                      <span className="hidden text-xl text-muted-foreground md:block">&rarr;</span>
                      <span className="block text-xl text-muted-foreground md:hidden">&darr;</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.chainNoRoute}</p>
          )}
        </CardContent>
      </Card>

      {/* Template Gallery */}
      {demoInfo && demoInfo.templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t.templateGalleryTitle}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {demoInfo.templates.map((tmpl) => (
              <Card key={tmpl.id}>
                <CardContent className="py-4">
                  <p className="font-semibold">
                    {language === "ja" ? tmpl.nameJa : tmpl.name}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {fmt(t.templateSteps, { n: tmpl.approvalSteps })}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {fmt(t.templateFields, { n: tmpl.fieldCount })}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {language === "ja"
                      ? tmpl.descriptionJa || tmpl.description || ""
                      : tmpl.description || ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Demo Request Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t.demoSectionTitle}</h2>
        <div className="space-y-3">
          {demoRequests.map((dr, i) => (
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
                          WF-2026{String(i + 1).padStart(2, "0")}-0001
                        </span>
                        {dr.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {typeLabels[dr.type] || dr.type}
                        {` · ${formatDate(dr.date)}`}
                        {dr.approvers && (
                          <> · {fmt(t.demoPendingApprover, { name: dr.approvers })}</>
                        )}
                      </p>
                      {dr.comment && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {t.comment}: {dr.comment}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[dr.status] || ""}`}
                    >
                      {statusLabels[dr.status] || dr.status}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Real Requests */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t.myRequestsTitle}</h2>

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
                <Card
                  key={request.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => handleCardClick(request)}
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
                          {typeLabels[request.template.type] || request.template.type}
                          {request.submittedAt && ` · ${formatDate(request.submittedAt)}`}
                          {request.approvals.length > 0 && (
                            <>
                              {" · "}
                              {t.headerApprover}:{" "}
                              {request.approvals.map((a) => a.approver.name).join(" → ")}
                            </>
                          )}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[request.status] || ""}`}
                      >
                        {statusLabels[request.status] || request.status}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <NewRequestDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        templates={templates}
        language={language}
        onCreated={fetchData}
      />

      <RequestDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={selectedRequest}
        language={language}
        onUpdated={fetchData}
      />
    </div>
  );
}
