"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";
import { cn } from "@/lib/utils";
import type { DataManagementTranslation } from "../translations";

// 型定義
interface Manager {
  id: string;
  name: string;
  position: string;
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  manager: Manager | null;
}

interface Section {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  courses: Course[];
  manager: Manager | null;
}

interface Department {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  sections: Section[];
  manager: Manager | null;
}

interface Organization {
  id: string;
  name: string;
  employeeCount: number;
}

interface OrganizationData {
  organization: Organization | null;
  departments: Department[];
}

interface EmployeeData {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  position: string;
  email: string | null;
  isActive: boolean;
  department: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  course: { id: string; name: string } | null;
}

interface OrganizeTabProps {
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
}

type UnitType = "department" | "section" | "course";

interface SelectedUnit {
  type: UnitType;
  id: string;
  name: string;
  currentManager: Manager | null;
}

type OrganizationStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

interface AutoAssignResult {
  type: "department" | "section" | "course";
  unitId: string;
  unitName: string;
  managerId: string;
  managerName: string;
  managerPosition: string;
  positionLevel: string;
}

interface AutoAssignSkipped {
  type: string;
  unitId: string;
  unitName: string;
  reason: "already_assigned" | "no_candidates";
}

interface PublishSettings {
  id: string;
  name: string;
  status: OrganizationStatus;
  publishAt: string | null;
  publishedAt: string | null;
}

// Manager candidate (from manager-candidates API)
interface ManagerCandidate {
  id: string;
  employeeId: string;
  name: string;
  position: string;
}

export function OrganizeTab({ organizationId, language, t }: OrganizeTabProps) {
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedSects, setExpandedSects] = useState<Set<string>>(new Set());

  // All employees (fetched once)
  const [allEmployees, setAllEmployees] = useState<EmployeeData[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Manager assignment dialog
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);
  const [managerCandidates, setManagerCandidates] = useState<
    ManagerCandidate[]
  >([]);
  const [managerSearch, setManagerSearch] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Publish settings
  const [publishSettings, setPublishSettings] =
    useState<PublishSettings | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [publishAction, setPublishAction] = useState<"publish" | "schedule">(
    "publish",
  );
  const [updatingPublish, setUpdatingPublish] = useState(false);

  // Cancel import
  const [cancelStatus, setCancelStatus] = useState<{
    canCancel: boolean;
    batchId?: string;
    importedAt?: string;
    changeLogCount?: number;
  } | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingImport, setCancellingImport] = useState(false);

  // Clear data
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [clearDataConfirmText, setClearDataConfirmText] = useState("");

  // Auto-assign managers
  const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignResults, setAutoAssignResults] = useState<{
    assignments: AutoAssignResult[];
    skipped: AutoAssignSkipped[];
  } | null>(null);
  const [autoAssignError, setAutoAssignError] = useState<string | null>(null);

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

  // Group employees by their most specific unit
  const employeesByUnit = useMemo(() => {
    const map: Record<string, EmployeeData[]> = {};
    for (const emp of allEmployees) {
      // Assign to the most specific unit
      if (emp.course?.id) {
        const key = `course:${emp.course.id}`;
        (map[key] ||= []).push(emp);
      } else if (emp.section?.id) {
        const key = `section:${emp.section.id}`;
        (map[key] ||= []).push(emp);
      } else if (emp.department?.id) {
        const key = `department:${emp.department.id}`;
        (map[key] ||= []).push(emp);
      }
    }
    return map;
  }, [allEmployees]);

  // Handle publish action
  const handlePublishAction = async () => {
    if (!organizationId) return;

    try {
      setUpdatingPublish(true);
      const body: {
        organizationId: string;
        action: string;
        publishAt?: string;
      } = {
        organizationId,
        action: publishAction,
      };

      if (publishAction === "schedule" && publishDate) {
        body.publishAt = new Date(publishDate).toISOString();
      }

      const response = await fetch("/api/admin/organization/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update publish settings");
      }

      await fetchPublishSettings();
      setShowPublishDialog(false);
      setPublishDate("");
    } catch (err) {
      console.error("Error updating publish settings:", err);
    } finally {
      setUpdatingPublish(false);
    }
  };

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

  // Cancel import (rollback)
  const handleCancelImport = async () => {
    try {
      setCancellingImport(true);
      const response = await fetch("/api/admin/organization/import/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel import");
      }

      // Refresh all data
      await Promise.all([
        fetchOrgData(),
        fetchAllEmployees(),
        fetchPublishSettings(),
        fetchCancelStatus(),
      ]);
      setShowCancelDialog(false);
    } catch (err) {
      console.error("Error cancelling import:", err);
    } finally {
      setCancellingImport(false);
    }
  };

  // Handle clear data
  const handleClearData = async () => {
    try {
      setClearingData(true);
      const response = await fetch(
        `/api/admin/organization/clear-data?organizationId=${organizationId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to clear data");
      }

      setShowClearDataDialog(false);
      await Promise.all([
        fetchOrgData(),
        fetchAllEmployees(),
        fetchPublishSettings(),
        fetchCancelStatus(),
      ]);
    } catch (err) {
      console.error("Error clearing data:", err);
    } finally {
      setClearingData(false);
    }
  };

  // Handle auto-assign managers
  const handleAutoAssign = async () => {
    try {
      setAutoAssigning(true);
      setAutoAssignError(null);
      const response = await fetch(
        "/api/admin/organization/auto-assign-managers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        if (data.error === "no_position_master") {
          setAutoAssignError("no_position_master");
          return;
        }
        throw new Error(data.error || "Failed to auto-assign");
      }

      const data = await response.json();
      setAutoAssignResults(data);
    } catch (err) {
      console.error("Error auto-assigning managers:", err);
      setAutoAssignError("error");
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleCloseAutoAssign = () => {
    setShowAutoAssignDialog(false);
    setAutoAssignResults(null);
    setAutoAssignError(null);
    if (autoAssignResults && autoAssignResults.assignments.length > 0) {
      fetchOrgData();
    }
  };

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

  // Fetch manager candidates for manager selection
  const fetchManagerCandidates = useCallback(
    async (unitType: UnitType, unitId: string) => {
      try {
        setLoadingCandidates(true);
        const params = new URLSearchParams();
        params.set("type", unitType);
        params.set("id", unitId);

        const response = await fetch(
          `/api/admin/organization/manager-candidates?${params}`,
        );
        if (!response.ok) throw new Error("Failed to fetch manager candidates");
        const data = await response.json();
        setManagerCandidates(data.candidates || []);
      } catch (err) {
        console.error("Error fetching manager candidates:", err);
        setManagerCandidates([]);
      } finally {
        setLoadingCandidates(false);
      }
    },
    [],
  );

  // Handle unit click to open manager assignment dialog
  const handleUnitClick = (
    type: UnitType,
    id: string,
    name: string,
    currentManager: Manager | null,
  ) => {
    setSelectedUnit({ type, id, name, currentManager });
    setManagerSearch("");
    fetchManagerCandidates(type, id);
  };

  // Handle manager assignment
  const handleAssignManager = async (employeeId: string | null) => {
    if (!selectedUnit) return;

    try {
      setUpdating(true);
      const response = await fetch("/api/admin/organization/manager", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedUnit.type,
          id: selectedUnit.id,
          managerId: employeeId,
        }),
      });

      if (!response.ok) throw new Error("Failed to update manager");

      // Refresh organization data
      await fetchOrgData();
      setSelectedUnit(null);
    } catch (err) {
      console.error("Error updating manager:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Toggle expand/collapse
  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  const toggleSect = (sectId: string) => {
    setExpandedSects((prev) => {
      const next = new Set(prev);
      if (next.has(sectId)) {
        next.delete(sectId);
      } else {
        next.add(sectId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!orgData) return;
    setExpandedDepts(new Set(orgData.departments.map((d) => d.id)));
    const allSects = new Set<string>();
    orgData.departments.forEach((d) => {
      d.sections.forEach((s) => {
        allSects.add(s.id);
      });
    });
    setExpandedSects(allSects);
  };

  const collapseAll = () => {
    setExpandedDepts(new Set());
    setExpandedSects(new Set());
  };

  // Filter manager candidates by search
  const filteredCandidates = managerCandidates.filter(
    (emp) =>
      emp.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(managerSearch.toLowerCase()) ||
      emp.position.toLowerCase().includes(managerSearch.toLowerCase()),
  );

  // Sort departments with "役員・顧問" last
  const sortedDepartments = useMemo(() => {
    if (!orgData?.departments) return [];
    return [...orgData.departments].sort((a, b) => {
      if (a.name === EXECUTIVES_DEPARTMENT_NAME) return 1;
      if (b.name === EXECUTIVES_DEPARTMENT_NAME) return -1;
      return 0;
    });
  }, [orgData?.departments]);

  // Get employee names for a unit (inline)
  const getUnitEmployeeNames = (type: UnitType, unitId: string) => {
    const unitKey = `${type}:${unitId}`;
    return employeesByUnit[unitKey] || [];
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

      {/* Controls — only show when data exists */}
      {hasData && <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={expandAll}
          className="text-xs"
        >
          {t.expandAll}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={collapseAll}
          className="text-xs"
        >
          {t.collapseAll}
        </Button>
        {publishSettings?.status === "DRAFT" && (
          <>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAutoAssignDialog(true)}
            >
              {t.autoAssignManagers}
            </Button>
          </>
        )}
      </div>}

      {/* Organization Tree */}
      {hasData && <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-4">
          {loadingEmployees && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
              {t.loading}
            </div>
          )}
          {/* Departments */}
          {sortedDepartments.map((dept) => {
            const isDeptExpanded = expandedDepts.has(dept.id);

            return (
              <Collapsible
                key={dept.id}
                open={isDeptExpanded}
                onOpenChange={() => toggleDept(dept.id)}
              >
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="p-1 hover:bg-muted rounded shrink-0"
                    >
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          isDeptExpanded && "rotate-90",
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </CollapsibleTrigger>

                  <span className="font-medium shrink-0">{dept.name}</span>

                  <button
                    type="button"
                    onClick={() =>
                      handleUnitClick(
                        "department",
                        dept.id,
                        dept.name,
                        dept.manager,
                      )
                    }
                    className="text-xs shrink-0 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {dept.manager ? (
                      <span>
                        {dept.manager.name} ({dept.manager.position})
                      </span>
                    ) : (
                      <span className="text-orange-500">{t.noManager}</span>
                    )}
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>

                  <Badge variant="secondary" className="text-xs ml-auto shrink-0">
                    {dept.employeeCount}
                  </Badge>
                </div>

                <CollapsibleContent className="ml-6 mt-1 space-y-1">
                  {dept.sections.map((sect) => {
                    const isSectExpanded = expandedSects.has(sect.id);

                    return (
                      <Collapsible
                        key={sect.id}
                        open={isSectExpanded}
                        onOpenChange={() => toggleSect(sect.id)}
                      >
                        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                          {sect.courses.length > 0 ? (
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="p-1 hover:bg-muted rounded shrink-0"
                              >
                                <svg
                                  className={cn(
                                    "w-3 h-3 transition-transform",
                                    isSectExpanded && "rotate-90",
                                  )}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                            </CollapsibleTrigger>
                          ) : (
                            <div className="w-5 shrink-0" />
                          )}

                          <span className="text-sm shrink-0">{sect.name}</span>

                          <button
                            type="button"
                            onClick={() =>
                              handleUnitClick(
                                "section",
                                sect.id,
                                sect.name,
                                sect.manager,
                              )
                            }
                            className="text-xs shrink-0 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <svg
                              className="w-2.5 h-2.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            {sect.manager ? (
                              <span>
                                {sect.manager.name} ({sect.manager.position})
                              </span>
                            ) : (
                              <span className="text-orange-500">
                                {t.noManager}
                              </span>
                            )}
                            <svg
                              className="w-2.5 h-2.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>

                          {(() => {
                            const emps = getUnitEmployeeNames("section", sect.id);
                            if (emps.length === 0) return null;
                            return (
                              <>
                                <div className="w-px h-4 bg-border shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {emps.map((e) => e.name).join("、")}
                                </span>
                              </>
                            );
                          })()}

                          <Badge variant="secondary" className="text-xs ml-auto shrink-0">
                            {sect.employeeCount}
                          </Badge>
                        </div>

                        <CollapsibleContent className="ml-6 mt-1 space-y-1 border-l border-muted pl-2">
                          {sect.courses.map((course) => (
                            <div
                              key={course.id}
                              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted"
                            >
                              <div className="w-5 shrink-0" />
                              <span className="text-sm shrink-0">
                                {course.name}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  handleUnitClick(
                                    "course",
                                    course.id,
                                    course.name,
                                    course.manager,
                                  )
                                }
                                className="text-xs shrink-0 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                              >
                                <svg
                                  className="w-2.5 h-2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                {course.manager ? (
                                  <span>
                                    {course.manager.name} ({course.manager.position})
                                  </span>
                                ) : (
                                  <span className="text-orange-500">
                                    {t.noManager}
                                  </span>
                                )}
                                <svg
                                  className="w-2.5 h-2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
                                </svg>
                              </button>

                              {(() => {
                                const emps = getUnitEmployeeNames("course", course.id);
                                if (emps.length === 0) return null;
                                return (
                                  <>
                                    <div className="w-px h-4 bg-border shrink-0" />
                                    <span className="text-xs text-muted-foreground truncate">
                                      {emps.map((e) => e.name).join("、")}
                                    </span>
                                  </>
                                );
                              })()}

                              <Badge
                                variant="secondary"
                                className="text-xs ml-auto shrink-0"
                              >
                                {course.employeeCount}
                              </Badge>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>}

      {/* Manager Assignment Dialog */}
      <Dialog open={!!selectedUnit} onOpenChange={() => setSelectedUnit(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUnit?.currentManager ? t.changeManager : t.assignManager}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected Unit Info */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">{selectedUnit?.name}</p>
              {selectedUnit?.currentManager && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t.manager}: {selectedUnit.currentManager.name} (
                  {selectedUnit.currentManager.position})
                </p>
              )}
            </div>

            {/* Search */}
            <Input
              placeholder={t.searchPlaceholder}
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
            />

            {/* Employee List */}
            <ScrollArea className="h-[300px] border rounded-md">
              {loadingCandidates ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t.noEmployees}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCandidates.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleAssignManager(emp.id)}
                      disabled={updating}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-md text-left hover:bg-muted transition-colors",
                        selectedUnit?.currentManager?.id === emp.id &&
                          "bg-primary/10",
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.employeeId} / {emp.position}
                        </p>
                      </div>
                      {selectedUnit?.currentManager?.id === emp.id && (
                        <Badge variant="secondary" className="text-xs">
                          {t.manager}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between">
              {selectedUnit?.currentManager && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleAssignManager(null)}
                  disabled={updating}
                >
                  {t.removeManager}
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setSelectedUnit(null)}>
                {t.cancel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Settings Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t.setPublishDate}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Selection */}
            <div className="flex gap-2">
              <Button
                variant={publishAction === "publish" ? "default" : "outline"}
                size="sm"
                onClick={() => setPublishAction("publish")}
                className="flex-1"
              >
                {t.publishNow}
              </Button>
              <Button
                variant={publishAction === "schedule" ? "default" : "outline"}
                size="sm"
                onClick={() => setPublishAction("schedule")}
                className="flex-1"
              >
                {t.schedulePublish}
              </Button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {publishAction === "publish"
                ? t.confirmPublishNow
                : t.confirmSchedule}
            </p>

            {/* Date Picker for Schedule */}
            {publishAction === "schedule" && (
              <div className="space-y-2">
                <label htmlFor="publishDate" className="text-sm font-medium">
                  {t.publishAt}
                </label>
                <Input
                  id="publishDate"
                  type="datetime-local"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPublishDialog(false);
                  setPublishDate("");
                }}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handlePublishAction}
                disabled={
                  updatingPublish ||
                  (publishAction === "schedule" && !publishDate)
                }
              >
                {updatingPublish
                  ? t.loading
                  : publishAction === "publish"
                    ? t.publishNow
                    : t.schedulePublish}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Import Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t.cancelImportTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {t.cancelImportDescription}
            </p>

            {/* Import Info */}
            {cancelStatus?.canCancel && (
              <div className="p-3 bg-muted rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.importedAt}:</span>
                  <span>{formatDate(cancelStatus.importedAt || null)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.affectedRecords}:
                  </span>
                  <span>{cancelStatus.changeLogCount}</span>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {t.cancelImportConfirm}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={cancellingImport}
              >
                {t.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelImport}
                disabled={cancellingImport}
              >
                {cancellingImport ? t.cancellingImport : t.cancelImport}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Data Dialog */}
      <Dialog
        open={showClearDataDialog}
        onOpenChange={(open) => {
          setShowClearDataDialog(open);
          if (!open) setClearDataConfirmText("");
        }}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t.clearDataTitle}</DialogTitle>
            <DialogDescription>{t.clearDataDescription}</DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{t.clearDataConfirm}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t.clearDataTypeDelete}
            </p>
            <Input
              value={clearDataConfirmText}
              onChange={(e) => setClearDataConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDataDialog(false)}
              disabled={clearingData}
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={clearingData || clearDataConfirmText !== "DELETE"}
            >
              {clearingData ? t.clearingData : t.clearData}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-assign Managers Dialog */}
      <Dialog
        open={showAutoAssignDialog}
        onOpenChange={(open) => {
          if (!open) handleCloseAutoAssign();
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t.autoAssignConfirmTitle}</DialogTitle>
            {!autoAssignResults && !autoAssignError && (
              <DialogDescription>
                {t.autoAssignConfirmMessage}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Error: No Position Master */}
          {autoAssignError === "no_position_master" && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md dark:bg-orange-950 dark:border-orange-800">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {t.autoAssignNoPositionMaster}
              </p>
            </div>
          )}

          {/* Error: General */}
          {autoAssignError === "error" && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {t.importError}
              </p>
            </div>
          )}

          {/* Results */}
          {autoAssignResults && (
            <div className="min-h-0 flex-1 space-y-2">
              <p className="text-sm font-medium">{t.autoAssignResult}</p>
              <ScrollArea className="max-h-[50vh] border rounded-md">
                <div className="p-3 space-y-1.5">
                  {autoAssignResults.assignments.map((a) => (
                    <div
                      key={`${a.type}:${a.unitId}`}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="text-green-600 dark:text-green-400 shrink-0">
                        &#10003;
                      </span>
                      <span>
                        {a.unitName} &rarr; {a.managerName}
                        {a.managerPosition && (
                          <span className="text-muted-foreground">
                            ({a.managerPosition})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  {autoAssignResults.skipped
                    .filter((s) => s.reason === "already_assigned")
                    .map((s) => (
                      <div
                        key={`${s.type}:${s.unitId}`}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="shrink-0">&mdash;</span>
                        <span>
                          {s.unitName}({t.autoAssignSkippedExisting})
                        </span>
                      </div>
                    ))}
                  {autoAssignResults.skipped
                    .filter((s) => s.reason === "no_candidates")
                    .map((s) => (
                      <div
                        key={`${s.type}:${s.unitId}`}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-orange-500 shrink-0">
                          &#9651;
                        </span>
                        <span>
                          {s.unitName}({t.autoAssignSkippedNoCandidates})
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Loading */}
          {autoAssigning && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          )}

          <DialogFooter>
            {!autoAssignResults && !autoAssignError && !autoAssigning && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowAutoAssignDialog(false)}
                >
                  {t.cancel}
                </Button>
                <Button onClick={handleAutoAssign}>
                  {t.autoAssignExecute}
                </Button>
              </>
            )}
            {(autoAssignResults || autoAssignError) && (
              <Button variant="outline" onClick={handleCloseAutoAssign}>
                {t.close}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
