"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";
import { cn } from "@/lib/utils";
import { EmployeeDetailDialog } from "./components/EmployeeDetailDialog";
import { type Language, type Translations, translations } from "./translations";

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

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  position: string;
  positionCode: string | null;
  department: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  course: { id: string; name: string } | null;
  isActive: boolean;
  joinDate: string | null;
}

interface OrganizationChartClientProps {
  language: Language;
}

export function OrganizationChartClient({
  language,
}: OrganizationChartClientProps) {
  const t: Translations = translations[language];

  // 組織データ
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  // 社員データ（全件）
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [positions, setPositions] = useState<string[]>([]);

  // フィルター
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  // ツリー展開状態
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedSects, setExpandedSects] = useState<Set<string>>(new Set());

  // 社員詳細ダイアログ
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );

  // 検索のデバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 組織データの取得
  const fetchOrgData = useCallback(async () => {
    try {
      setOrgLoading(true);
      setOrgError(null);
      const response = await fetch("/api/organization");
      if (!response.ok) throw new Error("Failed to fetch organization data");
      const data: OrganizationData = await response.json();
      setOrgData(data);
      // 全部署を展開
      if (data.departments) {
        setExpandedDepts(new Set(data.departments.map((d) => d.id)));
        const allSects = new Set<string>();
        data.departments.forEach((d) =>
          d.sections.forEach((s) => allSects.add(s.id)),
        );
        setExpandedSects(allSects);
      }
    } catch (error) {
      setOrgError(t.error);
      console.error("Error fetching organization data:", error);
    } finally {
      setOrgLoading(false);
    }
  }, [t.error]);

  // 社員データの取得（全件）
  const fetchAllEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const params = new URLSearchParams({ pageSize: "500", page: "1" });
      if (showInactive) params.set("isActive", "all");
      const response = await fetch(`/api/organization/employees?${params}`);
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setAllEmployees(data.employees || []);
      if (data.positions?.length > 0) {
        setPositions(data.positions);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  }, [showInactive]);

  useEffect(() => {
    fetchOrgData();
  }, [fetchOrgData]);

  useEffect(() => {
    fetchAllEmployees();
  }, [fetchAllEmployees]);

  // フィルタリングされた社員リスト
  const filteredEmployees = useMemo(() => {
    let filtered = allEmployees;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.employeeId.toLowerCase().includes(q) ||
          (emp.nameKana && emp.nameKana.toLowerCase().includes(q)),
      );
    }
    if (positionFilter !== "all") {
      filtered = filtered.filter((emp) => emp.position === positionFilter);
    }
    return filtered;
  }, [allEmployees, debouncedSearch, positionFilter]);

  // 社員をユニット別にグループ化
  const employeesByUnit = useMemo(() => {
    const map: Record<string, Employee[]> = {};
    for (const emp of filteredEmployees) {
      if (emp.course?.id) {
        (map[`course:${emp.course.id}`] ||= []).push(emp);
      } else if (emp.section?.id) {
        (map[`section:${emp.section.id}`] ||= []).push(emp);
      } else if (emp.department?.id) {
        (map[`department:${emp.department.id}`] ||= []).push(emp);
      }
    }
    return map;
  }, [filteredEmployees]);

  // 検索・フィルター中かどうか
  const isFiltering = debouncedSearch !== "" || positionFilter !== "all";

  // フィルター時にヒットした社員がいるユニットを判定
  const matchedUnitIds = useMemo(() => {
    if (!isFiltering) return null;
    const ids = new Set<string>();
    for (const emp of filteredEmployees) {
      if (emp.department?.id) ids.add(emp.department.id);
      if (emp.section?.id) ids.add(emp.section.id);
      if (emp.course?.id) ids.add(emp.course.id);
    }
    return ids;
  }, [filteredEmployees, isFiltering]);

  // Sort departments
  const sortedDepartments = useMemo(() => {
    if (!orgData?.departments) return [];
    return [...orgData.departments].sort((a, b) => {
      if (a.name === EXECUTIVES_DEPARTMENT_NAME) return 1;
      if (b.name === EXECUTIVES_DEPARTMENT_NAME) return -1;
      return 0;
    });
  }, [orgData?.departments]);

  // Toggle expand/collapse
  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  const toggleSect = (sectId: string) => {
    setExpandedSects((prev) => {
      const next = new Set(prev);
      if (next.has(sectId)) next.delete(sectId);
      else next.add(sectId);
      return next;
    });
  };

  const expandAll = () => {
    if (!orgData) return;
    setExpandedDepts(new Set(orgData.departments.map((d) => d.id)));
    const allSects = new Set<string>();
    orgData.departments.forEach((d) =>
      d.sections.forEach((s) => allSects.add(s.id)),
    );
    setExpandedSects(allSects);
  };

  const collapseAll = () => {
    setExpandedDepts(new Set());
    setExpandedSects(new Set());
  };

  const getUnitEmployees = (
    type: string,
    unitId: string,
    managerId?: string | null,
  ) => {
    const employees = employeesByUnit[`${type}:${unitId}`] || [];
    if (!managerId) return employees;
    return employees.filter((e) => e.id !== managerId);
  };

  // 社員名リストをレンダリング
  const renderEmployeeNames = (employees: Employee[]) => {
    if (employees.length === 0) return null;
    return (
      <>
        <div className="w-px h-4 bg-border shrink-0" />
        <span className="text-xs text-muted-foreground pr-2">
          {employees.map((e, i) => (
            <span key={e.id}>
              {i > 0 && "、"}
              <button
                type="button"
                onClick={() => setSelectedEmployeeId(e.id)}
                className="hover:text-primary hover:underline transition-all duration-200 hover:scale-110 inline-block origin-left"
              >
                {e.name}
              </button>
            </span>
          ))}
        </span>
      </>
    );
  };

  // 責任者をレンダリング
  const renderManager = (manager: Manager | null) => (
    <span className="text-xs shrink-0 flex items-center gap-1 text-muted-foreground">
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
      {manager ? (
        <button
          type="button"
          onClick={() => setSelectedEmployeeId(manager.id)}
          className="hover:text-primary hover:underline transition-all duration-200 hover:scale-110 inline-block origin-left"
        >
          {manager.name} ({manager.position})
        </button>
      ) : (
        <span className="text-orange-500">
          {language === "ja" ? "責任者未設定" : "No manager"}
        </span>
      )}
    </span>
  );

  if (orgLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{orgError}</p>
              <Button variant="outline" onClick={fetchOrgData}>
                {t.retry}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orgData?.organization) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12 text-muted-foreground">
              {t.noEmployees}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card>
        <CardContent className="p-6">
          {/* 検索・フィルターバー */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex-1 w-full sm:max-w-sm">
              <Input
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t.allPositions} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allPositions}</SelectItem>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showInactive ? "default" : "outline"}
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? t.showAll : t.activeOnly}
            </Button>
          </div>

          {/* コントロール + 合計 */}
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
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {t.total}: {filteredEmployees.length}
              {language === "ja" ? t.employees : ` ${t.employees}`}
            </span>
          </div>

          {/* 組織ツリー */}
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <div className="space-y-2 pr-4">
              {loadingEmployees && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                  {t.loading}
                </div>
              )}

              {sortedDepartments.map((dept) => {
                const isDeptExpanded = expandedDepts.has(dept.id);
                // フィルター中にマッチしない部署は非表示
                if (matchedUnitIds && !matchedUnitIds.has(dept.id)) {
                  // 子にマッチがあるかチェック
                  const hasChildMatch = dept.sections.some(
                    (s) =>
                      matchedUnitIds.has(s.id) ||
                      s.courses.some((c) => matchedUnitIds.has(c.id)),
                  );
                  if (!hasChildMatch) return null;
                }

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
                      {renderManager(dept.manager)}

                      {renderEmployeeNames(
                        getUnitEmployees("department", dept.id, dept.manager?.id),
                      )}

                      <Badge
                        variant="secondary"
                        className="text-xs ml-auto shrink-0"
                      >
                        {dept.employeeCount}
                      </Badge>
                    </div>

                    <CollapsibleContent className="ml-6 mt-1 space-y-1">
                      {dept.sections.map((sect) => {
                        const isSectExpanded = expandedSects.has(sect.id);
                        if (
                          matchedUnitIds &&
                          !matchedUnitIds.has(sect.id) &&
                          !sect.courses.some((c) => matchedUnitIds.has(c.id))
                        )
                          return null;

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

                              <span className="text-sm shrink-0">
                                {sect.name}
                              </span>
                              {renderManager(sect.manager)}

                              {renderEmployeeNames(
                                getUnitEmployees("section", sect.id, sect.manager?.id),
                              )}

                              <Badge
                                variant="secondary"
                                className="text-xs ml-auto shrink-0"
                              >
                                {sect.employeeCount}
                              </Badge>
                            </div>

                            <CollapsibleContent className="ml-6 mt-1 space-y-1 border-l border-muted pl-2">
                              {sect.courses.map((course) => {
                                if (
                                  matchedUnitIds &&
                                  !matchedUnitIds.has(course.id)
                                )
                                  return null;

                                return (
                                  <div
                                    key={course.id}
                                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted"
                                  >
                                    <div className="w-5 shrink-0" />
                                    <span className="text-sm shrink-0">
                                      {course.name}
                                    </span>
                                    {renderManager(course.manager)}

                                    {renderEmployeeNames(
                                      getUnitEmployees("course", course.id, course.manager?.id),
                                    )}

                                    <Badge
                                      variant="secondary"
                                      className="text-xs ml-auto shrink-0"
                                    >
                                      {course.employeeCount}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {isFiltering && filteredEmployees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t.noEmployees}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 社員詳細ダイアログ */}
      <EmployeeDetailDialog
        employeeId={selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
        t={t}
        language={language}
      />
    </div>
  );
}
