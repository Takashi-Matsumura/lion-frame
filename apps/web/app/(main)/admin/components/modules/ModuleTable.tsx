"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getModuleIcon } from "@/lib/modules/icons";
import type { ModuleInfo } from "@/types/admin";

type TypeFilter = "all" | "core" | "addon";
type StatusFilter = "all" | "enabled" | "disabled";

interface ModuleTableProps {
  modules: ModuleInfo[];
  selectedModuleId: string | null;
  language: "en" | "ja";
  onSelectModule: (module: ModuleInfo) => void;
  onToggleModule: (moduleId: string, enabled: boolean) => void;
}

export function ModuleTable({
  modules,
  selectedModuleId,
  language,
  onSelectModule,
  onToggleModule,
}: ModuleTableProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isFiltering = typeFilter !== "all" || statusFilter !== "all";

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      if (typeFilter === "core" && m.type !== "core") return false;
      if (typeFilter === "addon" && m.type === "core") return false;
      if (statusFilter === "enabled" && !m.enabled) return false;
      if (statusFilter === "disabled" && m.enabled) return false;
      return true;
    });
  }, [modules, typeFilter, statusFilter]);

  return (
    <div>
      {/* フィルタバー */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-1">
          {(["all", "core", "addon"] as const).map((v) => (
            <Button
              key={v}
              variant={typeFilter === v ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setTypeFilter(v)}
            >
              {v === "all" ? t("All", "全て") : v === "core" ? "Core" : "Addon"}
            </Button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs">|</span>
        <div className="flex items-center gap-1">
          {(["all", "enabled", "disabled"] as const).map((v) => (
            <Button
              key={v}
              variant={statusFilter === v ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setStatusFilter(v)}
            >
              {v === "all"
                ? t("All", "全て")
                : v === "enabled"
                  ? t("Enabled", "有効")
                  : t("Disabled", "無効")}
            </Button>
          ))}
        </div>
        {isFiltering && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground ml-auto"
            onClick={() => {
              setTypeFilter("all");
              setStatusFilter("all");
            }}
          >
            {t("Clear", "クリア")}
          </Button>
        )}
      </div>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">{t("Module", "モジュール")}</TableHead>
          <TableHead>{t("Type", "タイプ")}</TableHead>
          <TableHead className="text-center">{t("Status", "状態")}</TableHead>
          <TableHead className="text-center">{t("Menus", "メニュー")}</TableHead>
          <TableHead className="text-center">{t("Services", "サービス")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredModules.map((module) => (
          <TableRow
            key={module.id}
            data-state={selectedModuleId === module.id ? "selected" : undefined}
            className="cursor-pointer"
            onClick={() => onSelectModule(module)}
          >
            {/* モジュール名 */}
            <TableCell className="pl-4">
              <div className="flex items-center gap-2.5">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                  {getModuleIcon(module.id, "w-4 h-4")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {language === "ja" ? module.nameJa : module.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {language === "ja" ? module.name : module.nameJa}
                  </p>
                </div>
              </div>
            </TableCell>

            {/* タイプバッジ */}
            <TableCell>
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className={
                    module.type === "core"
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                      : module.type === "kiosk"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700"
                        : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
                  }
                >
                  {module.type === "core" ? "Core" : module.type === "kiosk" ? "Kiosk" : "Addon"}
                </Badge>
                {module.jaOnly && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700"
                  >
                    JA
                  </Badge>
                )}
                {module.mcpServer && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                  >
                    MCP
                  </Badge>
                )}
                {module.external && (
                  <Badge
                    variant="outline"
                    className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900 dark:text-sky-200 dark:border-sky-700"
                  >
                    Ext
                  </Badge>
                )}
              </div>
            </TableCell>

            {/* 有効/無効スイッチ */}
            <TableCell className="text-center">
              <div
                className="flex items-center justify-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={module.enabled}
                  onCheckedChange={(checked) =>
                    onToggleModule(module.id, checked)
                  }
                  disabled={module.type === "core"}
                  className="scale-90"
                />
                <span
                  className={`text-xs ${module.enabled ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}
                >
                  {module.enabled ? t("ON", "有効") : t("OFF", "無効")}
                </span>
              </div>
            </TableCell>

            {/* メニュー数 */}
            <TableCell className="text-center">
              <span className="text-sm">{module.menuCount}</span>
            </TableCell>

            {/* サービス数 */}
            <TableCell className="text-center">
              <span className="text-sm">{module.services?.length || 0}</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
