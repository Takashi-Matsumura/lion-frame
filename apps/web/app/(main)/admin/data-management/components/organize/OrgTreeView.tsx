"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";
import { cn } from "@/lib/utils";
import type {
  GroupManagerMap,
  OrganizationData,
  OrgEmployeeData,
  OrgManager,
  SelectedUnit,
  UnitType,
} from "@/types/organization";
import type { DataManagementTranslation } from "../../translations";

interface OrgTreeViewProps {
  orgData: OrganizationData;
  allEmployees: OrgEmployeeData[];
  language: "en" | "ja";
  t: DataManagementTranslation;
  onUnitClick: (unit: SelectedUnit) => void;
  loadingEmployees?: boolean;
  /** Whether the auto-assign button should be shown */
  isDraft?: boolean;
  onAutoAssignClick?: () => void;
  /** Group-level managers for cross-org comparison */
  groupManagers?: GroupManagerMap | null;
}

export function OrgTreeView({
  orgData,
  allEmployees,
  language,
  t,
  onUnitClick,
  loadingEmployees,
  isDraft,
  onAutoAssignClick,
  groupManagers,
}: OrgTreeViewProps) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedSects, setExpandedSects] = useState<Set<string>>(new Set());

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

  // Sort departments with "役員・顧問" last
  const sortedDepartments = useMemo(() => {
    if (!orgData?.departments) return [];
    return [...orgData.departments].sort((a, b) => {
      if (a.name === EXECUTIVES_DEPARTMENT_NAME) return 1;
      if (b.name === EXECUTIVES_DEPARTMENT_NAME) return -1;
      return 0;
    });
  }, [orgData?.departments]);

  // Group employees by their most specific unit
  const employeesByUnit = useMemo(() => {
    const map: Record<string, OrgEmployeeData[]> = {};
    for (const emp of allEmployees) {
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

  // Get employee names for a unit
  const getUnitEmployeeNames = (type: UnitType, unitId: string) => {
    const unitKey = `${type}:${unitId}`;
    return employeesByUnit[unitKey] || [];
  };

  const handleUnitClick = (
    type: UnitType,
    id: string,
    name: string,
    currentManager: { id: string; name: string; position: string } | null,
  ) => {
    onUnitClick({ type, id, name, currentManager });
  };

  // Render manager label with group-level fallback
  const renderManagerLabel = (
    ownManager: OrgManager | null,
    groupManager: OrgManager | null | undefined,
  ) => {
    if (ownManager) {
      return (
        <span>
          {ownManager.name} ({ownManager.position})
        </span>
      );
    }
    if (groupManager) {
      return (
        <span className="text-muted-foreground">
          <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1 rounded mr-1">
            {t.groupManagerSet}
          </span>
          {groupManager.name} ({groupManager.position})
        </span>
      );
    }
    return <span className="text-orange-500">{t.noManager}</span>;
  };

  return (
    <>
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
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
        {onAutoAssignClick && (
          <>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoAssignClick}
            >
              {t.autoAssignManagers}
            </Button>
          </>
        )}
      </div>

      {/* Organization Tree */}
      <ScrollArea className="flex-1 min-h-0">
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
                    {renderManagerLabel(
                      dept.manager,
                      groupManagers?.departments.get(dept.name),
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

                  {(() => {
                    const emps = getUnitEmployeeNames("department", dept.id);
                    if (emps.length === 0) return null;
                    return (
                      <>
                        <div className="w-px h-4 bg-border shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {emps.map((e) => e.name).join("\u3001")}
                        </span>
                      </>
                    );
                  })()}

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
                            {renderManagerLabel(
                              sect.manager,
                              groupManagers?.sections.get(`${dept.name}\0${sect.name}`),
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
                                  {emps.map((e) => e.name).join("\u3001")}
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
                                {renderManagerLabel(
                                  course.manager,
                                  groupManagers?.courses.get(`${dept.name}\0${sect.name}\0${course.name}`),
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
                                      {emps.map((e) => e.name).join("\u3001")}
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
      </ScrollArea>
    </>
  );
}
