"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  RiBuilding2Line,
  RiChat1Line,
  RiDatabase2Line,
  RiFolder3Line,
  RiOrganizationChart,
  RiSettings3Line,
  RiShieldUserLine,
  RiStackLine,
  RiTeamLine,
} from "react-icons/ri";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getPositionColor } from "@/lib/core-modules/organization/position-utils";
import { dashboardTranslations } from "./translations";

interface DashboardClientProps {
  language: "en" | "ja";
  userRole: string;
}

interface OrgData {
  organization: {
    id: string;
    name: string;
    employeeCount: number;
  } | null;
  departments: {
    id: string;
    name: string;
    employeeCount: number;
    sections: {
      id: string;
      name: string;
      employeeCount: number;
      courses: {
        id: string;
        name: string;
        employeeCount: number;
      }[];
    }[];
  }[];
}

interface Position {
  id: string;
  code: string;
  name: string;
  nameJa: string;
  level: number;
  isManager: boolean;
  color: string | null;
  displayOrder: number;
}

interface Employee {
  id: string;
  position: string | null;
  positionCode: string | null;
  positionColor: string | null;
}

const BAR_COLORS = [
  "bg-blue-500",
  "bg-cyan-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-rose-500",
];

export function DashboardClient({
  language,
  userRole,
}: DashboardClientProps) {
  const t = dashboardTranslations[language];
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [orgRes, posRes, empRes] = await Promise.allSettled([
      fetch("/api/organization"),
      fetch("/api/organization/positions"),
      fetch("/api/organization/employees?limit=9999&isActive=true"),
    ]);

    if (orgRes.status === "fulfilled" && orgRes.value.ok) {
      setOrgData(await orgRes.value.json());
    }
    if (posRes.status === "fulfilled" && posRes.value.ok) {
      const data = await posRes.value.json();
      setPositions(data.positions ?? []);
    }
    if (empRes.status === "fulfilled" && empRes.value.ok) {
      const data = await empRes.value.json();
      setEmployees(data.employees ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isAdmin = userRole === "ADMIN";
  const hasOrg = orgData?.organization != null;

  // Computed KPIs
  const totalEmployees = orgData?.organization?.employeeCount ?? 0;
  const deptCount = orgData?.departments?.length ?? 0;
  const sectionCount =
    orgData?.departments?.reduce(
      (sum, d) => sum + (d.sections?.length ?? 0),
      0,
    ) ?? 0;
  const courseCount =
    orgData?.departments?.reduce(
      (sum, d) =>
        sum +
        (d.sections?.reduce((s, sec) => s + (sec.courses?.length ?? 0), 0) ??
          0),
      0,
    ) ?? 0;

  // Position-based stats from employees
  const managerPositionCodes = new Set(
    positions.filter((p) => p.isManager).map((p) => p.code),
  );
  const managerCount = employees.filter(
    (e) => e.positionCode && managerPositionCodes.has(e.positionCode),
  ).length;
  const managerRate =
    totalEmployees > 0
      ? `${((managerCount / totalEmployees) * 100).toFixed(1)}%`
      : "—";

  // Position distribution counts
  const positionCounts = new Map<string, number>();
  for (const emp of employees) {
    const key = emp.positionCode ?? "__none__";
    positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1);
  }

  const kpiItems = [
    {
      icon: RiTeamLine,
      label: t.totalEmployees,
      value: totalEmployees,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/50",
    },
    {
      icon: RiBuilding2Line,
      label: t.departments,
      value: deptCount,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/50",
    },
    {
      icon: RiStackLine,
      label: t.sections,
      value: sectionCount,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-100 dark:bg-cyan-900/50",
    },
    {
      icon: RiFolder3Line,
      label: t.courses,
      value: courseCount,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/50",
    },
    {
      icon: RiShieldUserLine,
      label: t.managerRate,
      value: managerRate,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/50",
    },
  ];

  // Sort departments by employee count desc for bar chart
  const sortedDepts = [...(orgData?.departments ?? [])].sort(
    (a, b) => b.employeeCount - a.employeeCount,
  );
  const maxDeptCount = sortedDepts[0]?.employeeCount ?? 1;

  return (
    <div className="space-y-6">
      {loading ? (
        <LoadingSkeleton />
      ) : hasOrg ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {kpiItems.map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {item.label}
                      </p>
                      <p className="text-2xl font-bold">{item.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Department Composition + Position Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Composition */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t.deptCompositionTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedDepts.map((dept, idx) => {
                  const pct =
                    totalEmployees > 0
                      ? ((dept.employeeCount / totalEmployees) * 100).toFixed(1)
                      : "0";
                  const barWidth =
                    maxDeptCount > 0
                      ? (dept.employeeCount / maxDeptCount) * 100
                      : 0;
                  return (
                    <div key={dept.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="truncate font-medium">
                          {dept.name}
                        </span>
                        <span className="text-muted-foreground ml-2 shrink-0">
                          {dept.employeeCount}
                          {t.people} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Position Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t.positionDistTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {positions.length > 0 ? (
                  <div className="space-y-4">
                    {/* Manager / Non-manager summary */}
                    <div className="flex gap-4">
                      <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          {t.managers}
                        </p>
                        <p className="text-xl font-bold">{managerCount}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          {t.nonManagers}
                        </p>
                        <p className="text-xl font-bold">
                          {totalEmployees - managerCount}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    {/* Per-position badges */}
                    <div className="flex flex-wrap gap-2">
                      {positions.map((pos) => {
                        const count = positionCounts.get(pos.code) ?? 0;
                        const colorClass = getPositionColor(
                          pos.color,
                          pos.nameJa,
                        );
                        return (
                          <Badge key={pos.id} className={colorClass}>
                            {language === "ja" ? pos.nameJa : pos.name}: {count}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t.positionNoData}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <RiDatabase2Line className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.emptyTitle}</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                {t.emptyDescription}
              </p>
              {isAdmin && (
                <Button asChild>
                  <Link href="/admin/data-management">
                    {t.emptyAdminButton}
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {t.quickLinksTitle}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickLinkCard
            href="/org-chart"
            icon={RiOrganizationChart}
            title={t.orgChart}
            description={t.orgChartDesc}
          />
          <QuickLinkCard
            href="/ai-chat"
            icon={RiChat1Line}
            title={t.aiChat}
            description={t.aiChatDesc}
          />
          {isAdmin && (
            <QuickLinkCard
              href="/admin"
              icon={RiSettings3Line}
              title={t.adminPanel}
              description={t.adminPanelDesc}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function QuickLinkCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Two column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-16 flex-1 rounded-lg" />
              <Skeleton className="h-16 flex-1 rounded-lg" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
