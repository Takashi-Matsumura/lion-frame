"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FaClipboardList, FaStethoscope } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AuditLogsTableSkeleton } from "./AuditLogsSkeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auditLogsTranslations } from "./translations";

interface AuditLog {
  id: string;
  action: string;
  category: string;
  userId: string | null;
  targetId: string | null;
  targetType: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface AuditLogsClientProps {
  language: "en" | "ja";
}

const PAGE_SIZE = 25;

export function AuditLogsClient({ language }: AuditLogsClientProps) {
  const t = auditLogsTranslations[language];
  const isMobile = useIsMobile();
  const { open } = useSidebar();
  const { width } = useSidebarStore();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * PAGE_SIZE;
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: offset.toString(),
        ...(categoryFilter !== "ALL" && { category: categoryFilter }),
        ...(actionFilter !== "ALL" && { action: actionFilter }),
      });

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(Math.ceil(data.total / PAGE_SIZE));
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, actionFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleRunDiagnostics = useCallback(async () => {
    setRunningDiagnostics(true);
    try {
      const response = await fetch("/api/admin/diagnostics", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to run diagnostics");
      }
      // 診断完了後、ログを再取得して結果を表示
      setPage(1);
      await fetchAuditLogs();
    } catch (error) {
      console.error("Error running diagnostics:", error);
    } finally {
      setRunningDiagnostics(false);
    }
  }, [fetchAuditLogs]);

  const renderDetails = (log: AuditLog) => {
    if (!log.details) return null;

    const details = JSON.parse(log.details);

    // 診断結果の詳細表示
    if (log.action === "SYSTEM_DIAGNOSTIC" && details.diagnosticId) {
      const name = language === "ja" ? details.diagnosticNameJa : details.diagnosticName;
      const message = language === "ja" ? details.messageJa : details.message;
      const statusLabel =
        details.status === "pass"
          ? t.diagnosticStatusPass
          : details.status === "fail"
            ? t.diagnosticStatusFail
            : t.diagnosticStatusWarn;
      const statusColor =
        details.status === "pass"
          ? "text-green-600"
          : details.status === "fail"
            ? "text-red-600"
            : "text-yellow-600";

      return (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>
            {t.diagnosticTarget}: <span className="font-medium text-foreground">{name}</span>
          </p>
          <p>
            {t.diagnosticStatus}:{" "}
            <span className={`font-medium ${statusColor}`}>{statusLabel}</span>
          </p>
          <p>{message}</p>
          {details.durationMs !== undefined && (
            <p>
              {t.diagnosticDuration}: {details.durationMs}ms
            </p>
          )}
        </div>
      );
    }

    // 通常の詳細表示
    return (
      <div className="text-xs text-muted-foreground space-y-0.5">
        {details.provider && (
          <p>
            {t.provider}: {details.provider}
          </p>
        )}
        {details.username && (
          <p>
            {t.username}: {details.username}
          </p>
        )}
        {details.email && !log.user?.email && (
          <p>
            {t.email}: {details.email}
          </p>
        )}
        {details.reason && (
          <p className="text-red-600">
            {t.reason}: {details.reason}
          </p>
        )}
        {details.title && (
          <p>
            {t.detailTitle}: {details.title}
          </p>
        )}
        {details.oldRole && details.newRole && (
          <p>
            {details.oldRole} → {details.newRole}
          </p>
        )}
      </div>
    );
  };

  const sidebarLeft = isMobile ? "0" : open ? `${width}px` : "4rem";

  return (
    <div
      className="fixed inset-0 flex flex-col transition-all duration-300"
      style={{
        top: "4.5rem",
        left: sidebarLeft,
      }}
    >
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto p-6 h-full flex flex-col">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="p-6 flex-1 flex flex-col min-h-0">
          {/* フィルター + 診断ボタン */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t.category}:
              </Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.allCategories} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.all}</SelectItem>
                  <SelectItem value="AUTH">{t.categoryAuth}</SelectItem>
                  <SelectItem value="USER_MANAGEMENT">
                    {t.categoryUserManagement}
                  </SelectItem>
                  <SelectItem value="SYSTEM_SETTING">
                    {t.categorySystemSetting}
                  </SelectItem>
                  <SelectItem value="MODULE">{t.categoryModule}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t.action}:
              </Label>
              <Select
                value={actionFilter}
                onValueChange={(value) => {
                  setActionFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.allActions} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.all}</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">
                    {t.actionLoginSuccess}
                  </SelectItem>
                  <SelectItem value="LOGIN_FAILURE">
                    {t.actionLoginFailure}
                  </SelectItem>
                  <SelectItem value="LOGOUT">{t.actionLogout}</SelectItem>
                  <SelectItem value="USER_CREATE">
                    {t.actionUserCreate}
                  </SelectItem>
                  <SelectItem value="USER_DELETE">
                    {t.actionUserDelete}
                  </SelectItem>
                  <SelectItem value="USER_ROLE_CHANGE">
                    {t.actionRoleChange}
                  </SelectItem>
                  <SelectItem value="TWO_FACTOR_ENABLE">
                    {t.actionTwoFactorEnable}
                  </SelectItem>
                  <SelectItem value="TWO_FACTOR_DISABLE">
                    {t.actionTwoFactorDisable}
                  </SelectItem>
                  <SelectItem value="PROFILE_IMAGE_UPDATE">
                    {t.actionProfileImageUpdate}
                  </SelectItem>
                  <SelectItem value="PROFILE_IMAGE_DELETE">
                    {t.actionProfileImageDelete}
                  </SelectItem>
                  <SelectItem value="OAUTH_TOGGLE">
                    {t.actionOauthToggle}
                  </SelectItem>
                  <SelectItem value="AI_CONFIG_UPDATE">
                    {t.actionAiConfigUpdate}
                  </SelectItem>
                  <SelectItem value="MODULE_TOGGLE">
                    {t.actionModuleToggle}
                  </SelectItem>
                  <SelectItem value="MENU_TOGGLE">
                    {t.actionMenuToggle}
                  </SelectItem>
                  <SelectItem value="ACCESS_KEY_PERMISSION_UPDATE">
                    {t.actionAccessKeyPermissionUpdate}
                  </SelectItem>
                  <SelectItem value="ACCESS_KEY_CREATE">
                    {t.actionAccessKeyCreate}
                  </SelectItem>
                  <SelectItem value="ACCESS_KEY_TOGGLE">
                    {t.actionAccessKeyToggle}
                  </SelectItem>
                  <SelectItem value="ACCESS_KEY_DELETE">
                    {t.actionAccessKeyDelete}
                  </SelectItem>
                  <SelectItem value="ANNOUNCEMENT_CREATE">
                    {t.actionAnnouncementCreate}
                  </SelectItem>
                  <SelectItem value="ANNOUNCEMENT_UPDATE">
                    {t.actionAnnouncementUpdate}
                  </SelectItem>
                  <SelectItem value="ANNOUNCEMENT_DELETE">
                    {t.actionAnnouncementDelete}
                  </SelectItem>
                  <SelectItem value="DATA_IMPORT">
                    {t.actionDataImport}
                  </SelectItem>
                  <SelectItem value="DATA_IMPORT_CANCEL">
                    {t.actionDataImportCancel}
                  </SelectItem>
                  <SelectItem value="DATA_CLEAR">
                    {t.actionDataClear}
                  </SelectItem>
                  <SelectItem value="ORGANIZATION_PUBLISH">
                    {t.actionOrganizationPublish}
                  </SelectItem>
                  <SelectItem value="MANAGER_ASSIGN">
                    {t.actionManagerAssign}
                  </SelectItem>
                  <SelectItem value="MANAGER_AUTO_ASSIGN">
                    {t.actionManagerAutoAssign}
                  </SelectItem>
                  <SelectItem value="AI_CHAT_MESSAGE">
                    {t.actionAiChatMessage}
                  </SelectItem>
                  <SelectItem value="ORG_CONTEXT_TOGGLE">
                    {t.actionOrgContextToggle}
                  </SelectItem>
                  <SelectItem value="SYSTEM_DIAGNOSTIC">
                    {t.actionSystemDiagnostic}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunDiagnostics}
                disabled={runningDiagnostics}
                className="gap-2"
              >
                <FaStethoscope className="h-3.5 w-3.5" />
                {runningDiagnostics ? t.runningDiagnostics : t.runDiagnostics}
              </Button>
            </div>
          </div>

          {/* ローディング */}
          {loading && (
            <AuditLogsTableSkeleton />
          )}

          {/* ログテーブル */}
          {!loading && logs.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* ページネーション（上部） */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t.total}:{" "}
                  <span className="font-medium text-foreground">{total}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t.previous}
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium">{page}</span>
                    <span className="text-sm text-muted-foreground">/</span>
                    <span className="text-sm text-muted-foreground">
                      {totalPages || 1}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page >= totalPages}
                    className="gap-1"
                  >
                    {t.next}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* テーブル */}
              <div className="rounded-lg border overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/50 z-10">
                      <TableRow>
                        <TableHead className="w-[160px]">
                          {t.dateTime}
                        </TableHead>
                        <TableHead className="w-[140px]">
                          {t.category}
                        </TableHead>
                        <TableHead className="w-[160px]">
                          {t.action}
                        </TableHead>
                        <TableHead className="w-[180px]">
                          {t.user}
                        </TableHead>
                        <TableHead>{t.details}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const isSuccess =
                          log.action.includes("SUCCESS") ||
                          log.action.includes("CREATE");
                        const isFailure =
                          log.action.includes("FAILURE") ||
                          log.action.includes("DELETE");

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">
                              {new Date(log.createdAt).toLocaleString(
                                language === "ja" ? "ja-JP" : "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  log.category === "AUTH"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : log.category === "USER_MANAGEMENT"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : log.category === "SYSTEM_SETTING"
                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                        : "bg-orange-50 text-orange-700 border-orange-200"
                                }
                              >
                                {log.category === "AUTH" && t.badgeAuth}
                                {log.category === "USER_MANAGEMENT" &&
                                  t.badgeUser}
                                {log.category === "SYSTEM_SETTING" &&
                                  t.badgeSystem}
                                {log.category === "MODULE" && t.badgeModule}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  isSuccess
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : isFailure
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-gray-50 text-gray-700 border-gray-200"
                                }
                              >
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.user ? (
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {log.user.name || "-"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {log.user.email}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{renderDetails(log)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* データなし */}
          {!loading && logs.length === 0 && (
            <EmptyState
              icon={<FaClipboardList className="w-12 h-12 text-muted-foreground" />}
              message={t.noAuditLogs}
            />
          )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
