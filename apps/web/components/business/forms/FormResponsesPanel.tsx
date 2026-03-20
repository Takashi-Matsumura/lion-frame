"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Bell, ChevronDown, ChevronRight, Check, Minus } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { LoadingSpinner } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formBuilderTranslations, type Language } from "@/app/(main)/(menus)/(manager)/form-builder/translations";

// ─── Types ───

interface DeptEmployee {
  employeeId: string;
  name: string;
  email: string;
  respondedAt?: string | null;
  userId?: string | null;
}

interface DepartmentStatus {
  id: string;
  name: string;
  responded: DeptEmployee[];
  notResponded: DeptEmployee[];
}

interface ResponseStatus {
  formId: string;
  totalEmployees: number;
  totalResponded: number;
  totalNotResponded: number;
  responseRate: number;
  departments: DepartmentStatus[];
}

// ─── Component ───

export function FormResponsesPanel({
  formId,
  language,
}: {
  formId: string;
  language: Language;
}) {
  const t = formBuilderTranslations[language];
  const [status, setStatus] = useState<ResponseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [reminding, setReminding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/responses/status`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatus(data);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [formId, t.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  const handleRemind = async (userIds?: string[]) => {
    setReminding(true);
    try {
      const res = await fetch(`/api/forms/${formId}/responses/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: userIds ?? [] }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`${data.sent}${t.remindSentCount}`);
    } catch {
      toast.error(t.loadError);
    } finally {
      setReminding(false);
    }
  };

  const handleExportXlsx = async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/responses/export`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename\*=UTF-8''(.+)/);
      a.download = match?.[1] ? decodeURIComponent(match[1]) : "responses.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t.loadError);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!status) return null;

  const { totalEmployees, totalResponded, totalNotResponded, responseRate, departments } = status;

  return (
    <div className="space-y-4">
      {/* ─── Summary ─── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              {/* 回答率 */}
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">{responseRate}%</div>
                <div className="text-xs text-muted-foreground">{t.responseRate}</div>
              </div>
              {/* 内訳 */}
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-semibold">{totalEmployees}</div>
                  <div className="text-xs text-muted-foreground">{t.totalEmployees}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">{totalResponded}</div>
                  <div className="text-xs text-muted-foreground">{t.totalResponded}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">{totalNotResponded}</div>
                  <div className="text-xs text-muted-foreground">{t.totalNotResponded}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExportXlsx}
              >
                <Download className="h-4 w-4" />
                {t.exportXlsx}
              </Button>
              {totalNotResponded > 0 && (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => handleRemind()}
                  disabled={reminding}
                  loading={reminding}
                >
                  <Bell className="h-4 w-4" />
                  {t.remindAll}
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${responseRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Department breakdown ─── */}
      {totalEmployees === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.noEmployees}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {departments.map((dept) => {
            const total = dept.responded.length + dept.notResponded.length;
            const rate = total > 0 ? Math.round((dept.responded.length / total) * 100) : 0;
            const isExpanded = expandedDepts.has(dept.id);
            const isComplete = dept.notResponded.length === 0;

            return (
              <Card key={dept.id}>
                <CardHeader
                  className="py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleDept(dept.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <CardTitle className="text-sm font-medium">{dept.name}</CardTitle>
                      {isComplete ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                          <Check className="h-3 w-3" />
                          {rate}%
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          {rate}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {dept.responded.length} / {total}{t.persons}
                      </span>
                      {/* Mini progress bar */}
                      <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-orange-400"}`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    {/* 未回答者テーブル */}
                    {dept.notResponded.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                            <Minus className="h-3 w-3" />
                            {t.notRespondedLabel} ({dept.notResponded.length})
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              const userIds = dept.notResponded
                                .map((emp) => emp.userId)
                                .filter(Boolean) as string[];
                              if (userIds.length > 0) handleRemind(userIds);
                            }}
                            disabled={reminding}
                          >
                            <Bell className="h-3 w-3" />
                            {t.remindDepartment}
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">{t.employeeId}</TableHead>
                              <TableHead className="text-xs">{t.employeeName}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dept.notResponded.map((emp) => (
                              <TableRow key={emp.employeeId}>
                                <TableCell className="text-sm py-1.5">{emp.employeeId}</TableCell>
                                <TableCell className="text-sm py-1.5">{emp.name}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* 回答済みテーブル */}
                    {dept.responded.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5 mb-2">
                          <Check className="h-3 w-3" />
                          {t.responded} ({dept.responded.length})
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">{t.employeeId}</TableHead>
                              <TableHead className="text-xs">{t.employeeName}</TableHead>
                              <TableHead className="text-xs">{t.respondedAt}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dept.responded.map((emp) => (
                              <TableRow key={emp.employeeId}>
                                <TableCell className="text-sm py-1.5">{emp.employeeId}</TableCell>
                                <TableCell className="text-sm py-1.5">{emp.name}</TableCell>
                                <TableCell className="text-sm py-1.5 text-muted-foreground">
                                  {emp.respondedAt
                                    ? new Date(emp.respondedAt).toLocaleDateString("ja-JP")
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
