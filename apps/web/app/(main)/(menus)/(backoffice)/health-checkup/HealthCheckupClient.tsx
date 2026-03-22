"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  Check,
  Minus,
  AlertTriangle,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  BackButton,
} from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { HealthCheckupAIAnalysis } from "@/components/business/health-checkup/HealthCheckupAIAnalysis";
import { healthCheckupTranslations, type Language } from "./translations";

// ─── Types ───

interface CampaignItem {
  id: string;
  title: string;
  fiscalYear: number;
  description: string | null;
  deadline: string | null;
  recordCount: number;
  completionRate: number;
  createdAt: string;
}

interface CampaignStats {
  total: number;
  notBooked: number;
  pending: number;
  booked: number;
  visited: number;
  completed: number;
  exempt: number;
  completionRate: number;
}

interface DepartmentStat {
  departmentId: string;
  departmentName: string;
  total: number;
  notBooked: number;
  pending: number;
  booked: number;
  visited: number;
  completed: number;
  exempt: number;
}

interface RecordItem {
  id: string;
  status: string;
  bookingMethod: string | null;
  facility: string | null;
  checkupType: string | null;
  preferredDates: string[] | null;
  confirmedDate: string | null;
  importedAt: string | null;
  employee: {
    id: string;
    employeeId: string;
    name: string;
    department: { id: string; name: string };
    section: { id: string; name: string } | null;
  };
}

interface ImportPreview {
  matched: { employeeId: string; employeeName: string; bookingMethod?: string; checkupType?: string; isExisting?: boolean }[];
  unmatched: { row: number; submitter: string; reason: string }[];
  duplicates: { row: number; employeeId: string; name: string }[];
  total: number;
}

type ViewMode = "list" | "detail" | "records" | "import";

const statusColors: Record<string, string> = {
  NOT_BOOKED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  BOOKED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  VISITED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  EXEMPT: "bg-muted text-muted-foreground",
};

// ─── Component ───

export function HealthCheckupClient({ language }: { language: Language }) {
  const t = healthCheckupTranslations[language];

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignItem | null>(null);

  // Create/Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // null = create, string = edit
  const [editTitle, setEditTitle] = useState("");
  const [editYear, setEditYear] = useState(new Date().getFullYear());
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CampaignItem | null>(null);

  // Detail state
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([]);

  // Records state
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Confirm date dialog state
  const [confirmTarget, setConfirmTarget] = useState<RecordItem | null>(null);
  const [confirmDate, setConfirmDate] = useState("");

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<"new_only" | "overwrite">("new_only");
  const [columnMapping, setColumnMapping] = useState({
    employee: "",
    bookingMethod: "",
    facility: "",
    checkupType: "",
    preferredDates: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── List operations ───

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/health-checkup");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const openCreateDialog = () => {
    setEditId(null);
    setEditTitle("");
    setEditYear(new Date().getFullYear());
    setEditDesc("");
    setEditOpen(true);
  };

  const openEditDialog = (c: CampaignItem) => {
    setEditId(c.id);
    setEditTitle(c.title);
    setEditYear(c.fiscalYear);
    setEditDesc(c.description ?? "");
    setEditOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const body = {
        title: editTitle,
        fiscalYear: editYear,
        description: editDesc || undefined,
      };
      const res = editId
        ? await fetch(`/api/health-checkup/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/health-checkup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) throw new Error();
      toast.success(t.saved);
      setEditOpen(false);
      loadCampaigns();
    } catch {
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/health-checkup/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.deleted);
      setDeleteTarget(null);
      loadCampaigns();
    } catch {
      toast.error(t.loadError);
    }
  };

  // ─── Detail / Dashboard ───

  const openDetail = useCallback(async (campaign: CampaignItem) => {
    setSelectedCampaignId(campaign.id);
    setSelectedCampaign(campaign);
    setViewMode("detail");
    try {
      const res = await fetch(`/api/health-checkup/${campaign.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data.stats);
      setDeptStats(data.departments);
    } catch {
      toast.error(t.loadError);
    }
  }, [t.loadError]);


  // ─── Records ───

  const loadRecords = useCallback(async () => {
    if (!selectedCampaignId) return;
    setRecordsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/health-checkup/${selectedCampaignId}/records?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch {
      toast.error(t.loadError);
    } finally {
      setRecordsLoading(false);
    }
  }, [selectedCampaignId, statusFilter, searchQuery, t.loadError]);

  useEffect(() => {
    if (viewMode === "records") loadRecords();
  }, [viewMode, loadRecords]);

  const handleStatusChange = async (recordId: string, newStatus: string) => {
    try {
      const res = await fetch(
        `/api/health-checkup/${selectedCampaignId}/records/${recordId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (!res.ok) throw new Error();
      loadRecords();
    } catch {
      toast.error(t.saveError);
    }
  };

  const openConfirmDialog = (rec: RecordItem) => {
    setConfirmTarget(rec);
    setConfirmDate("");
  };

  const handleConfirmDate = async () => {
    if (!confirmTarget || !confirmDate) return;
    try {
      const res = await fetch(
        `/api/health-checkup/${selectedCampaignId}/records/${confirmTarget.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "BOOKED", confirmedDate: confirmDate }),
        },
      );
      if (!res.ok) throw new Error();
      toast.success(t.saved);
      setConfirmTarget(null);
      loadRecords();
    } catch {
      toast.error(t.saveError);
    }
  };

  // ─── Import ───

  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportPreview(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("columnMapping", JSON.stringify({}));

    try {
      const res = await fetch(`/api/health-checkup/${selectedCampaignId}/import`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.messageJa || errData?.error || "Import failed");
      }
      const data = await res.json();
      setImportHeaders(data.headers ?? []);

      // 自動マッピング推定
      const headers: string[] = data.headers ?? [];
      const autoMapping = { ...columnMapping };
      for (const h of headers) {
        if (h.includes("社員") || h.includes("Employee")) autoMapping.employee = h;
        else if (h.includes("予約方法")) autoMapping.bookingMethod = h;
        else if (h.includes("健診機関") || h.includes("医療機関")) autoMapping.facility = h;
        else if (h.includes("健康診断") || h.includes("健診")) autoMapping.checkupType = h;
        else if (h.includes("希望日") || h.includes("候補")) autoMapping.preferredDates = h;
      }
      setColumnMapping(autoMapping);
    } catch (e) {
      toast.error((e as Error).message);
      setImportFile(null);
    }
  };

  const handlePreview = async () => {
    if (!importFile || !selectedCampaignId) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("columnMapping", JSON.stringify(columnMapping));
      const res = await fetch(`/api/health-checkup/${selectedCampaignId}/import`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setImportPreview(data.preview);
    } catch {
      toast.error(t.importError);
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile || !selectedCampaignId) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("columnMapping", JSON.stringify(columnMapping));
      formData.append("action", "confirm");
      formData.append("mode", importMode);
      const res = await fetch(`/api/health-checkup/${selectedCampaignId}/import`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const parts = [`新規: ${data.created}`];
      if (data.updated > 0) parts.push(`更新: ${data.updated}`);
      if (data.skipped > 0) parts.push(`スキップ: ${data.skipped}`);
      toast.success(`${t.importSuccess}（${parts.join(", ")}）`);
      setImportFile(null);
      setImportPreview(null);
      setImportHeaders([]);
      // ダッシュボードに戻る
      if (selectedCampaign) openDetail(selectedCampaign);
    } catch {
      toast.error(t.importError);
    } finally {
      setImporting(false);
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedCampaignId(null);
    setSelectedCampaign(null);
    setStats(null);
    setDeptStats([]);
    setRecords([]);
    setImportFile(null);
    setImportPreview(null);
    loadCampaigns();
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      NOT_BOOKED: t.statusNotBooked,
      PENDING: t.statusPending,
      BOOKED: t.statusBooked,
      VISITED: t.statusVisited,
      COMPLETED: t.statusCompleted,
      EXEMPT: t.statusExempt,
    };
    return map[status] ?? status;
  };

  // ═══════════════════════════
  // Loading
  // ═══════════════════════════
  if (loading && viewMode === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
              <CardContent><Skeleton className="h-3 w-24" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════
  // Detail / Dashboard
  // ═══════════════════════════
  if ((viewMode === "detail" || viewMode === "records" || viewMode === "import") && selectedCampaignId) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton onClick={handleBackToList} />
            <div>
              <h2 className="text-lg font-semibold">{selectedCampaign?.title}</h2>
              <span className="text-xs text-muted-foreground">
                {selectedCampaign?.fiscalYear}{t.fiscalYear}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {(["detail", "records", "import"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode(mode)}
              >
                {mode === "detail" ? t.dashboard : mode === "records" ? t.employeeList : t.import}
              </Button>
            ))}
          </div>
        </div>

        {/* ─── Dashboard Tab ─── */}
        {viewMode === "detail" && stats && (
          <div className="grid grid-cols-[1fr_400px] gap-4 h-[calc(100vh-260px)]">
            {/* Left: Summary + Department Table */}
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{stats.completionRate}%</div>
                      <div className="text-xs text-muted-foreground">{t.completionRate}</div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{stats.total}</div>
                        <div className="text-xs text-muted-foreground">{t.totalEmployees}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
                        <div className="text-xs text-muted-foreground">{t.pending}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{stats.booked}</div>
                        <div className="text-xs text-muted-foreground">{t.booked}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">{stats.visited}</div>
                        <div className="text-xs text-muted-foreground">{t.visited}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.completed}</div>
                        <div className="text-xs text-muted-foreground">{t.completed}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">{stats.notBooked}</div>
                        <div className="text-xs text-muted-foreground">{t.notBooked}</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Department Table */}
              {stats.total === 0 ? (
                <EmptyState
                  message={t.noRecords}
                  description={t.noRecordsDescription}
                />
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{t.department}</TableHead>
                        <TableHead className="text-xs text-right">{t.totalEmployees}</TableHead>
                        <TableHead className="text-xs text-right">{t.pending}</TableHead>
                        <TableHead className="text-xs text-right">{t.booked}</TableHead>
                        <TableHead className="text-xs text-right">{t.visited}</TableHead>
                        <TableHead className="text-xs text-right">{t.completed}</TableHead>
                        <TableHead className="text-xs text-right">{t.notBooked}</TableHead>
                        <TableHead className="text-xs w-32">{t.progress}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deptStats.map((dept) => {
                        const rate = dept.total > 0
                          ? Math.round(((dept.booked + dept.visited + dept.completed) / dept.total) * 100)
                          : 0;
                        const isComplete = dept.notBooked === 0;
                        return (
                          <TableRow key={dept.departmentId}>
                            <TableCell className="text-sm font-medium">{dept.departmentName}</TableCell>
                            <TableCell className="text-sm text-right">{dept.total}</TableCell>
                            <TableCell className="text-sm text-right text-yellow-600 dark:text-yellow-400">{dept.pending}</TableCell>
                            <TableCell className="text-sm text-right text-blue-600 dark:text-blue-400">{dept.booked}</TableCell>
                            <TableCell className="text-sm text-right text-purple-600 dark:text-purple-400">{dept.visited}</TableCell>
                            <TableCell className="text-sm text-right text-green-600 dark:text-green-400">{dept.completed}</TableCell>
                            <TableCell className="text-sm text-right text-orange-600 dark:text-orange-400">{dept.notBooked}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-blue-500"}`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-8 text-right">{rate}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>

            {/* Right: AI Analysis */}
            <div className="min-h-0">
              <HealthCheckupAIAnalysis
                campaignTitle={selectedCampaign?.title ?? ""}
                stats={stats}
                departments={deptStats}
              />
            </div>
          </div>
        )}

        {/* ─── Records Tab ─── */}
        {viewMode === "records" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue>
                    {statusFilter === "all" ? (
                      <span className="text-sm">{t.allStatuses}</span>
                    ) : (
                      <Badge className={`${statusColors[statusFilter]} text-xs`}>
                        {getStatusLabel(statusFilter)}
                      </Badge>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allStatuses}</SelectItem>
                  <SelectItem value="NOT_BOOKED"><Badge className={`${statusColors.NOT_BOOKED} text-xs`}>{t.statusNotBooked}</Badge></SelectItem>
                  <SelectItem value="PENDING"><Badge className={`${statusColors.PENDING} text-xs`}>{t.statusPending}</Badge></SelectItem>
                  <SelectItem value="BOOKED"><Badge className={`${statusColors.BOOKED} text-xs`}>{t.statusBooked}</Badge></SelectItem>
                  <SelectItem value="VISITED"><Badge className={`${statusColors.VISITED} text-xs`}>{t.statusVisited}</Badge></SelectItem>
                  <SelectItem value="COMPLETED"><Badge className={`${statusColors.COMPLETED} text-xs`}>{t.statusCompleted}</Badge></SelectItem>
                  <SelectItem value="EXEMPT"><Badge className={`${statusColors.EXEMPT} text-xs`}>{t.statusExempt}</Badge></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recordsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <EmptyState message={t.noRecords} description={t.noRecordsDescription} />
            ) : (
              <Card>
                <div className="max-h-[calc(100vh-330px)] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="text-xs">{t.employeeId}</TableHead>
                      <TableHead className="text-xs">{t.employeeName} / {t.departmentName}</TableHead>
                      <TableHead className="text-xs">{t.status}</TableHead>
                      <TableHead className="text-xs">{t.bookingMethod}</TableHead>
                      <TableHead className="text-xs">{t.facility} / {t.checkupType}</TableHead>
                      <TableHead className="text-xs">{t.preferredDates}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="text-sm">{rec.employee.employeeId}</TableCell>
                        <TableCell>
                          <div className="text-sm">{rec.employee.name}</div>
                          <div className="text-xs text-muted-foreground">{rec.employee.department.name}</div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={rec.status}
                            onValueChange={(v) => handleStatusChange(rec.id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-24">
                              <Badge className={`${statusColors[rec.status]} text-xs`}>
                                {getStatusLabel(rec.status)}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NOT_BOOKED">{t.statusNotBooked}</SelectItem>
                              <SelectItem value="PENDING">{t.statusPending}</SelectItem>
                              <SelectItem value="BOOKED">{t.statusBooked}</SelectItem>
                              <SelectItem value="VISITED">{t.statusVisited}</SelectItem>
                              <SelectItem value="COMPLETED">{t.statusCompleted}</SelectItem>
                              <SelectItem value="EXEMPT">{t.statusExempt}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm">{rec.bookingMethod ?? "-"}</TableCell>
                        <TableCell>
                          <div className="text-sm">{rec.facility ?? "-"}</div>
                          <div className="text-xs text-muted-foreground">{rec.checkupType ?? "-"}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rec.confirmedDate ? (
                            new Date(rec.confirmedDate).toLocaleDateString("ja-JP", {
                              month: "long",
                              day: "numeric",
                              weekday: "short",
                            })
                          ) : rec.status === "PENDING" && rec.preferredDates ? (
                            <button
                              type="button"
                              className="text-left text-primary hover:underline cursor-pointer"
                              onClick={() => openConfirmDialog(rec)}
                            >
                              {(rec.preferredDates as string[]).filter(Boolean).join(", ")}
                            </button>
                          ) : rec.preferredDates ? (
                            (rec.preferredDates as string[]).filter(Boolean).join(", ")
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─── Import Tab ─── */}
        {viewMode === "import" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t.importTitle}</CardTitle>
                <p className="text-xs text-muted-foreground">{t.importDescription}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File upload */}
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileSelect(f);
                  }}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {importFile ? importFile.name : t.dropFile}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                </div>

                {/* Column mapping */}
                {importHeaders.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs font-medium">{t.columnMapping}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ["employee", t.employeeColumn],
                        ["bookingMethod", t.bookingMethodColumn],
                        ["facility", t.facilityColumn],
                        ["checkupType", t.checkupTypeColumn],
                        ["preferredDates", t.preferredDatesColumn],
                      ] as const).map(([key, label]) => (
                        <div key={key}>
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <Select
                            value={columnMapping[key] || "__none__"}
                            onValueChange={(v) =>
                              setColumnMapping((prev) => ({
                                ...prev,
                                [key]: v === "__none__" ? "" : v,
                              }))
                            }
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder={t.unmapped} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">{t.unmapped}</SelectItem>
                              {importHeaders.map((h, i) => (
                                <SelectItem key={`${i}-${h}`} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    <div>
                      <Label className="text-xs">{t.importMode}</Label>
                      <Select value={importMode} onValueChange={(v) => setImportMode(v as "new_only" | "overwrite")}>
                        <SelectTrigger className="text-sm w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_only">{t.importModeNewOnly}</SelectItem>
                          <SelectItem value="overwrite">{t.importModeOverwrite}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handlePreview}
                      disabled={importing}
                      loading={importing}
                    >
                      {t.preview}
                    </Button>
                  </div>
                )}

                {/* Preview results */}
                {importPreview && (() => {
                  const newRecs = importPreview.matched.filter((m: { isExisting?: boolean }) => !m.isExisting);
                  const existRecs = importPreview.matched.filter((m: { isExisting?: boolean }) => m.isExisting);
                  const dispRecs = importMode === "new_only" ? newRecs : importPreview.matched;
                  const impCount = importMode === "new_only" ? newRecs.length : importPreview.matched.length;

                  return (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-medium">{t.previewResult}</h4>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>{t.matchedRecords}: {newRecs.length}</span>
                      </div>
                      {importMode === "new_only" && existRecs.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Minus className="h-4 w-4 text-muted-foreground" />
                          <span>{t.skippedRecords}: {existRecs.length}</span>
                        </div>
                      )}
                      {importMode === "overwrite" && existRecs.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span>上書き: {existRecs.length}</span>
                        </div>
                      )}
                      {importPreview.unmatched.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span>{t.unmatchedRecords}: {importPreview.unmatched.length}</span>
                        </div>
                      )}
                      {importPreview.duplicates.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Minus className="h-4 w-4 text-muted-foreground" />
                          <span>{t.duplicateRecords}: {importPreview.duplicates.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Preview table */}
                    {dispRecs.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">{t.employeeId}</TableHead>
                            <TableHead className="text-xs">{t.employeeName}</TableHead>
                            <TableHead className="text-xs">{t.bookingMethod}</TableHead>
                            <TableHead className="text-xs">{t.checkupType}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dispRecs.slice(0, 10).map((m, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{m.employeeId}</TableCell>
                              <TableCell className="text-sm">{m.employeeName}</TableCell>
                              <TableCell className="text-sm">{m.bookingMethod ?? "-"}</TableCell>
                              <TableCell className="text-sm">{m.checkupType ?? "-"}</TableCell>
                            </TableRow>
                          ))}
                          {dispRecs.length > 10 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                                ...他 {dispRecs.length - 10} 件
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    ) : importMode === "new_only" && existRecs.length > 0 ? (
                      <p className="text-sm text-muted-foreground">新規レコードはありません。{existRecs.length}件はすべて既存データのためスキップされます。</p>
                    ) : null}

                    {/* Unmatched */}
                    {importPreview.unmatched.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-orange-600 mb-2">{t.unmatchedRecords}</h5>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">{t.row}</TableHead>
                              <TableHead className="text-xs">{t.employeeName}</TableHead>
                              <TableHead className="text-xs">{t.reason}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importPreview.unmatched.map((u, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-sm">{u.row}</TableCell>
                                <TableCell className="text-sm">{u.submitter}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{u.reason}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Confirm button */}
                    {impCount > 0 && (
                      <Button
                        onClick={handleConfirmImport}
                        disabled={importing}
                        loading={importing}
                      >
                        {importing ? t.importing : `${t.confirmImport}（${impCount}件）`}
                      </Button>
                    )}
                  </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Confirm date dialog */}
        <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t.confirmDateTitle}</DialogTitle>
              <DialogDescription>{t.confirmDateDescription}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {confirmTarget?.preferredDates && (confirmTarget.preferredDates as string[]).filter(Boolean).length > 0 && (
                <div>
                  <Label className="text-xs">{t.selectFromCandidates}</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(confirmTarget.preferredDates as string[]).filter(Boolean).map((d) => (
                      <Button
                        key={d}
                        variant={confirmDate === d ? "default" : "outline"}
                        size="sm"
                        onClick={() => setConfirmDate(d)}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">{t.enterManually}</Label>
                <DatePicker
                  value={confirmDate}
                  onChange={(v) => setConfirmDate(v)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmTarget(null)}>
                  {t.cancel}
                </Button>
                <Button
                  onClick={handleConfirmDate}
                  disabled={!confirmDate}
                >
                  {t.confirm}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════
  // Campaign List
  // ═══════════════════════════
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        <Button onClick={openCreateDialog}>{t.newCampaign}</Button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState message={t.noCampaigns} description={t.noCampaignsDescription} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openDetail(c)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{c.title}</CardTitle>
                  <Badge className="bg-muted text-muted-foreground shrink-0">
                    {c.fiscalYear}{t.fiscalYear}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span>{t.records}: {c.recordCount}</span>
                  <span>{t.completionRate}: {c.completionRate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${c.completionRate}%` }}
                  />
                </div>
                <div
                  className="flex gap-2 mt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(c)}
                  >
                    {t.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleteTarget(c)}
                  >
                    {t.delete}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? t.edit : t.newCampaign}</DialogTitle>
            <DialogDescription>{t.subtitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">{t.campaignTitle}</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t.campaignTitlePlaceholder}
              />
            </div>
            <div>
              <Label className="text-xs">{t.fiscalYear}</Label>
              <Input
                type="number"
                value={editYear}
                onChange={(e) => setEditYear(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">{t.campaignDescription}</Label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                {t.cancel}
              </Button>
              <Button
                onClick={handleSaveCampaign}
                disabled={saving || !editTitle.trim()}
                loading={saving}
              >
                {editId ? t.save : t.create}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
