"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  watasuManagementTranslations,
  type Language,
} from "./translations";

interface EmployeeAccessInfo {
  employeeId: string;
  employeeName: string;
  departmentName: string;
  sectionName: string | null;
  userId: string | null;
  hasAccess: boolean;
  expiresAt: string | null;
}

function formatRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "期限切れ";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `残り ${hours}時間${minutes}分`;
  return `残り ${minutes}分`;
}

type AccessFilter = "all" | "enabled" | "disabled" | "no-account";

interface Props {
  language: Language;
}

export function WatasuManagementClient({ language }: Props) {
  const t = watasuManagementTranslations[language];
  const [employees, setEmployees] = useState<EmployeeAccessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/watasu/access");
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(data.employees);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // 課の一覧を抽出
  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const emp of employees) {
      if (emp.sectionName) set.add(emp.sectionName);
    }
    return Array.from(set).sort();
  }, [employees]);

  // フィルタ適用
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (sectionFilter !== "all" && emp.sectionName !== sectionFilter)
        return false;
      if (accessFilter === "enabled" && !emp.hasAccess) return false;
      if (accessFilter === "disabled" && (emp.hasAccess || !emp.userId))
        return false;
      if (accessFilter === "no-account" && emp.userId !== null) return false;
      return true;
    });
  }, [employees, sectionFilter, accessFilter]);

  const isFiltering = sectionFilter !== "all" || accessFilter !== "all";

  async function handleToggle(
    employeeId: string,
    userId: string,
    enabled: boolean,
  ) {
    setTogglingId(employeeId);

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.employeeId === employeeId ? { ...emp, hasAccess: enabled } : emp,
      ),
    );

    try {
      const res = await fetch("/api/watasu/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, employeeId, enabled }),
      });

      if (!res.ok) {
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.employeeId === employeeId
              ? { ...emp, hasAccess: !enabled }
              : emp,
          ),
        );
      }
    } catch {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.employeeId === employeeId
            ? { ...emp, hasAccess: !enabled }
            : emp,
        ),
      );
    } finally {
      setTogglingId(null);
    }
  }

  // スケルトン
  if (loading) {
    return (
      <Card className="flex flex-col overflow-hidden max-h-[calc(100vh-12rem)]">
        <div className="p-4 border-b space-y-2 shrink-0">
          <Skeleton className="h-4 w-64" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-6 w-px" />
            <Skeleton className="h-6 w-12 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
          </div>
        </div>
        <div className="flex-1">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="h-10 px-4 text-left">
                  <Skeleton className="h-4 w-14" />
                </th>
                <th className="h-10 px-2 text-left">
                  <Skeleton className="h-4 w-10" />
                </th>
                <th className="h-10 px-2 text-left">
                  <Skeleton className="h-4 w-8" />
                </th>
                <th className="h-10 px-2 text-center">
                  <Skeleton className="h-4 w-14 mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 pl-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="p-2">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="p-2">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="p-2">
                    <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col overflow-hidden max-h-[calc(100vh-12rem)]">
      {/* ヘッダー + フィルタ */}
      <div className="p-4 border-b space-y-2 shrink-0">
        <p className="text-sm text-muted-foreground">{t.description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {/* 課フィルタ（コンボボックス） */}
          {sections.length > 0 && (
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger size="sm" className="h-7 text-xs w-auto min-w-[8rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allSections}</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-muted-foreground text-xs">|</span>
          {/* アクセス状態フィルタ */}
          <div className="flex items-center gap-1">
            {(["all", "enabled", "disabled", "no-account"] as const).map(
              (v) => (
                <Button
                  key={v}
                  variant={accessFilter === v ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setAccessFilter(v)}
                >
                  {v === "all"
                    ? t.filterAll
                    : v === "enabled"
                      ? t.enabled
                      : v === "disabled"
                        ? t.disabled
                        : t.noAccount}
                </Button>
              ),
            )}
          </div>
          {isFiltering && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground ml-auto"
              onClick={() => {
                setSectionFilter("all");
                setAccessFilter("all");
              }}
            >
              {t.clearFilter}
            </Button>
          )}
        </div>
      </div>

      {/* テーブル */}
      {filteredEmployees.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t.noEmployees}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="pl-4">{t.employeeName}</TableHead>
                <TableHead>{t.department}</TableHead>
                <TableHead>{t.section}</TableHead>
                <TableHead className="text-center">{t.access}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.employeeId}>
                  <TableCell className="pl-4 font-medium">
                    {emp.employeeName}
                  </TableCell>
                  <TableCell>{emp.departmentName}</TableCell>
                  <TableCell>
                    {emp.sectionName || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {emp.userId ? (
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={emp.hasAccess}
                          onCheckedChange={(checked) =>
                            handleToggle(
                              emp.employeeId,
                              emp.userId!,
                              checked,
                            )
                          }
                          disabled={togglingId === emp.employeeId}
                        />
                        <span
                          className={`text-xs ${emp.hasAccess ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}
                        >
                          {emp.hasAccess && emp.expiresAt
                            ? formatRemaining(emp.expiresAt)
                            : emp.hasAccess
                              ? t.enabled
                              : t.disabled}
                        </span>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {t.noAccount}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
