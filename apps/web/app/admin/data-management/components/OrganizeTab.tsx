"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import type {
  GroupManagerMap,
  OrganizationData,
  OrgEmployeeData,
  OrganizationStatus,
  PublishSettings,
  SelectedUnit,
} from "@/types/organization";
import type { DataManagementTranslation } from "../translations";
import { OrgTreeView } from "./organize/OrgTreeView";
import { ManagerAssignDialog } from "./organize/ManagerAssignDialog";
import { PublishDialog } from "./organize/PublishDialog";
import { OrgActionDialogs } from "./organize/OrgActionDialogs";

interface OrganizeTabProps {
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
}

export function OrganizeTab({ organizationId, language, t }: OrganizeTabProps) {
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // All employees (fetched once)
  const [allEmployees, setAllEmployees] = useState<OrgEmployeeData[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Manager assignment dialog
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);

  // Publish settings
  const [publishSettings, setPublishSettings] =
    useState<PublishSettings | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [updatingPublish, setUpdatingPublish] = useState(false);

  // Cancel import
  const [cancelStatus, setCancelStatus] = useState<{
    canCancel: boolean;
    batchId?: string;
    importedAt?: string;
    changeLogCount?: number;
  } | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Clear data
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);

  // Auto-assign managers
  const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false);

  // Apply pending imports
  const [pendingCount, setPendingCount] = useState(0);
  const [applyingPending, setApplyingPending] = useState(false);
  const [showApplyPendingDialog, setShowApplyPendingDialog] = useState(false);
  const [applyPendingResult, setApplyPendingResult] = useState<{
    type: "success" | "none";
    applied?: number;
  } | null>(null);

  // Group-level managers (for cross-org comparison)
  const [groupManagers, setGroupManagers] = useState<GroupManagerMap | null>(null);

  // Fetch organization data
  const fetchOrgData = useCallback(async () => {
    try {
      // 初回のみスケルトン表示（再取得時はOrgTreeViewをアンマウントしない）
      if (!hasLoadedRef.current) {
        setLoading(true);
      }
      setError(null);
      const response = await fetch(
        `/api/organization?organizationId=${organizationId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch organization data");
      const data: OrganizationData = await response.json();
      setOrgData(data);
    } catch (err) {
      setError("Failed to load organization data");
      console.error("Error fetching organization data:", err);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [organizationId]);

  // Fetch all employees for the organization (single call)
  const fetchAllEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const params = new URLSearchParams({
        organizationId,
        pageSize: "200",
        page: "1",
      });
      const response = await fetch(
        `/api/admin/organization/employees?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setAllEmployees(data.employees || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoadingEmployees(false);
    }
  }, [organizationId]);

  // Fetch publish settings
  const fetchPublishSettings = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetch(
        `/api/admin/organization/publish?organizationId=${organizationId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setPublishSettings(data);
      }
    } catch (err) {
      console.error("Error fetching publish settings:", err);
    }
  }, [organizationId]);

  // Fetch cancel status
  const fetchCancelStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/organization/import/cancel");
      if (response.ok) {
        const data = await response.json();
        setCancelStatus(data);
      }
    } catch (err) {
      console.error("Error fetching cancel status:", err);
    }
  }, []);

  // Fetch pending import count
  const fetchPendingCount = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/organization/apply-pending");
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.count || 0);
      }
    } catch (err) {
      console.error("Error fetching pending count:", err);
    }
  }, []);

  // Fetch group-level managers (merged view) for cross-org comparison
  const fetchGroupManagers = useCallback(async () => {
    try {
      const response = await fetch("/api/organization");
      if (!response.ok) return;
      const data: OrganizationData = await response.json();
      if (!data.departments || data.departments.length === 0) return;

      const deptMap = new Map<string, { id: string; name: string; position: string }>();
      const sectMap = new Map<string, { id: string; name: string; position: string }>();
      const courseMap = new Map<string, { id: string; name: string; position: string }>();

      for (const dept of data.departments) {
        if (dept.manager) deptMap.set(dept.name, dept.manager);
        for (const sect of dept.sections) {
          if (sect.manager) sectMap.set(`${dept.name}\0${sect.name}`, sect.manager);
          for (const course of sect.courses) {
            if (course.manager) courseMap.set(`${dept.name}\0${sect.name}\0${course.name}`, course.manager);
          }
        }
      }

      setGroupManagers({ departments: deptMap, sections: sectMap, courses: courseMap });
    } catch (err) {
      console.error("Error fetching group managers:", err);
    }
  }, []);

  // Apply pending imports
  const handleApplyPending = async () => {
    try {
      setApplyingPending(true);
      const response = await fetch("/api/admin/organization/apply-pending", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to apply pending imports");
      const data = await response.json();
      if (data.applied > 0) {
        setApplyPendingResult({ type: "success", applied: data.applied });
        await refreshAllData();
        await fetchPendingCount();
      } else {
        setApplyPendingResult({ type: "none" });
      }
    } catch (err) {
      console.error("Error applying pending imports:", err);
    } finally {
      setApplyingPending(false);
      setShowApplyPendingDialog(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
    fetchAllEmployees();
    fetchPublishSettings();
    fetchCancelStatus();
    fetchPendingCount();
    fetchGroupManagers();
  }, [fetchOrgData, fetchAllEmployees, fetchPublishSettings, fetchCancelStatus, fetchPendingCount, fetchGroupManagers]);

  // Cancel scheduled publish
  const handleCancelSchedule = async () => {
    if (!organizationId) return;

    try {
      setUpdatingPublish(true);
      const response = await fetch("/api/admin/organization/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          action: "cancel",
        }),
      });

      if (!response.ok) throw new Error("Failed to cancel schedule");
      await fetchPublishSettings();
    } catch (err) {
      console.error("Error canceling schedule:", err);
    } finally {
      setUpdatingPublish(false);
    }
  };

  // Refresh all data (called by child components after mutations)
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchOrgData(),
      fetchAllEmployees(),
      fetchPublishSettings(),
      fetchCancelStatus(),
      fetchPendingCount(),
      fetchGroupManagers(),
    ]);
  }, [fetchOrgData, fetchAllEmployees, fetchPublishSettings, fetchCancelStatus, fetchPendingCount, fetchGroupManagers]);

  // Get status badge color
  const getStatusBadgeClass = (status: OrganizationStatus) => {
    switch (status) {
      case "DRAFT":
        return "bg-muted text-muted-foreground";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "PUBLISHED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Get status label
  const getStatusLabel = (status: OrganizationStatus) => {
    switch (status) {
      case "DRAFT":
        return t.statusDraft;
      case "SCHEDULED":
        return t.statusScheduled;
      case "PUBLISHED":
        return t.statusPublished;
      case "ARCHIVED":
        return t.statusArchived;
      default:
        return status;
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <PageSkeleton contentHeight="h-[400px]" />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={fetchOrgData}>
          {t.refresh}
        </Button>
      </div>
    );
  }

  if (!orgData?.organization) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t.noOrganization}
      </div>
    );
  }

  const hasData = (orgData?.departments?.length ?? 0) > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header with Publish Settings */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t.organizeTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.organizeDescription}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Apply Pending Imports Button */}
          {pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApplyPendingDialog(true)}
              disabled={applyingPending}
              className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              {t.applyPendingImports}
              <Badge className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0">
                {pendingCount}
              </Badge>
            </Button>
          )}
        {publishSettings && (
          <>
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeClass(publishSettings.status)}>
                {getStatusLabel(publishSettings.status)}
              </Badge>
            </div>

            {/* Publish Date Info */}
            {publishSettings.status === "SCHEDULED" &&
              publishSettings.publishAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(publishSettings.publishAt)}
                </span>
              )}
            {publishSettings.status === "PUBLISHED" &&
              publishSettings.publishedAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(publishSettings.publishedAt)}
                </span>
              )}

            {/* Action Buttons */}
            {publishSettings.status === "DRAFT" && hasData && (
              <>
                {cancelStatus?.canCancel && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    {t.cancelImport}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearDataDialog(true)}
                >
                  {t.clearData}
                </Button>
                <Button size="sm" onClick={() => setShowPublishDialog(true)}>
                  {t.setPublishDate}
                </Button>
              </>
            )}
            {publishSettings.status === "SCHEDULED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSchedule}
                disabled={updatingPublish}
              >
                {t.cancelSchedule}
              </Button>
            )}
          </>
        )}
        </div>
      </div>

      {/* Empty state when no data imported */}
      {!hasData && (
        <div className="text-center py-16 text-muted-foreground">
          <svg
            className="w-12 h-12 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <p>{t.noImportData}</p>
          <p className="text-xs mt-1">{t.noImportDataHint}</p>
        </div>
      )}

      {/* Organization Tree */}
      {hasData && (
        <OrgTreeView
          orgData={orgData}
          allEmployees={allEmployees}
          language={language}
          t={t}
          onUnitClick={(unit) => setSelectedUnit(unit)}
          loadingEmployees={loadingEmployees}
          isDraft={publishSettings?.status === "DRAFT"}
          onAutoAssignClick={() => setShowAutoAssignDialog(true)}
          groupManagers={groupManagers}
        />
      )}

      {/* Manager Assignment Dialog */}
      <ManagerAssignDialog
        selectedUnit={selectedUnit}
        organizationId={organizationId}
        language={language}
        t={t}
        onClose={() => setSelectedUnit(null)}
        onAssigned={refreshAllData}
      />

      {/* Publish Settings Dialog */}
      <PublishDialog
        isOpen={showPublishDialog}
        publishSettings={publishSettings}
        organizationId={organizationId}
        language={language}
        t={t}
        onClose={() => setShowPublishDialog(false)}
        onPublished={fetchPublishSettings}
      />

      {/* Apply Pending Confirm Dialog */}
      <Dialog
        open={showApplyPendingDialog}
        onOpenChange={(open) => { if (!open) setShowApplyPendingDialog(false); }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t.applyPendingTitle}</DialogTitle>
            <DialogDescription>{t.applyPendingDescription}</DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted rounded-md text-sm">
            {t.applyPendingConfirm}
            <span className="ml-1 font-medium">({pendingCount}{language === "ja" ? "件" : " items"})</span>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApplyPendingDialog(false)}
              disabled={applyingPending}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleApplyPending}
              disabled={applyingPending}
            >
              {applyingPending ? t.loading : t.autoAssignExecute}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Pending Result Dialog */}
      <Dialog
        open={applyPendingResult !== null}
        onOpenChange={(open) => { if (!open) setApplyPendingResult(null); }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t.applyPendingTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            {applyPendingResult?.type === "success"
              ? `${t.applyPendingSuccess}（${applyPendingResult.applied}${language === "ja" ? "件" : " items"}）`
              : t.applyPendingNone}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyPendingResult(null)}>
              {t.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialogs (Cancel Import, Clear Data, Auto-assign) */}
      <OrgActionDialogs
        organizationId={organizationId}
        language={language}
        t={t}
        cancelStatus={cancelStatus}
        showCancelDialog={showCancelDialog}
        showClearDataDialog={showClearDataDialog}
        showAutoAssignDialog={showAutoAssignDialog}
        onCancelDialogClose={() => setShowCancelDialog(false)}
        onClearDialogClose={() => setShowClearDataDialog(false)}
        onAutoAssignClose={() => setShowAutoAssignDialog(false)}
        onDataChanged={refreshAllData}
      />
    </div>
  );
}
