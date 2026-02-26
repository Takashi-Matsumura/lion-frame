"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import type {
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

  // Fetch organization data
  const fetchOrgData = useCallback(async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchOrgData();
    fetchAllEmployees();
    fetchPublishSettings();
    fetchCancelStatus();
  }, [fetchOrgData, fetchAllEmployees, fetchPublishSettings, fetchCancelStatus]);

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
    ]);
  }, [fetchOrgData, fetchAllEmployees, fetchPublishSettings, fetchCancelStatus]);

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
        {publishSettings && (
          <div className="flex items-center gap-3">
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
          </div>
        )}
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
        />
      )}

      {/* Manager Assignment Dialog */}
      <ManagerAssignDialog
        selectedUnit={selectedUnit}
        organizationId={organizationId}
        language={language}
        t={t}
        onClose={() => setSelectedUnit(null)}
        onAssigned={fetchOrgData}
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
