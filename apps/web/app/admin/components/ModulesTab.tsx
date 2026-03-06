"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Key,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BackButton } from "@/components/ui/BackButton";
import { getModuleIcon } from "@/lib/modules/icons";
import type {
  ModulesData,
  ModuleInfo,
} from "@/types/admin";
import { ModulesTabSkeletonContent } from "./skeletons";

interface ModulesTabProps {
  language: "en" | "ja";
}

export function ModulesTab({ language }: ModulesTabProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // モジュール管理の状態
  const [modulesData, setModulesData] = useState<ModulesData | null>(null);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<ModuleInfo | null>(null);
  const [expandedServices, setExpandedServices] = useState<
    Record<string, boolean>
  >({});
  const [mcpPanelOpen, setMcpPanelOpen] = useState(false);
  const [mcpApiKeyExists, setMcpApiKeyExists] = useState(false);
  const [mcpApiKeyMasked, setMcpApiKeyMasked] = useState<string | null>(null);
  const [mcpApiKeyRevealed, setMcpApiKeyRevealed] = useState<string | null>(
    null,
  );
  const [mcpApiKeyLoading, setMcpApiKeyLoading] = useState(false);
  const [mcpApiKeyCopied, setMcpApiKeyCopied] = useState(false);

  // モジュールデータを取得
  const fetchModules = useCallback(async () => {
    try {
      setModulesLoading(true);
      const response = await fetch("/api/admin/modules");
      if (!response.ok) {
        throw new Error("Failed to fetch modules");
      }
      const data: ModulesData = await response.json();
      setModulesData(data);
    } catch (error) {
      console.error("Error fetching modules:", error);
    } finally {
      setModulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  // モジュールの有効/無効を切り替え
  const handleToggleModule = useCallback(
    async (moduleId: string, enabled: boolean) => {
      try {
        const response = await fetch("/api/admin/modules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleId, enabled }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update module");
        }

        // ローカルの状態を更新
        setModulesData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            modules: prev.modules.map((m) =>
              m.id === moduleId ? { ...m, enabled } : m,
            ),
            statistics: {
              ...prev.statistics,
              enabled: enabled
                ? prev.statistics.enabled + 1
                : prev.statistics.enabled - 1,
              disabled: enabled
                ? prev.statistics.disabled - 1
                : prev.statistics.disabled + 1,
            },
          };
        });
      } catch (error) {
        console.error("Error toggling module:", error);
        alert(
          t(
            error instanceof Error ? error.message : "Failed to update module",
            error instanceof Error
              ? error.message
              : "モジュールの更新に失敗しました",
          ),
        );
      }
    },
    [t],
  );

  // メニューの有効/無効を切り替え
  const handleToggleMenu = useCallback(
    async (menuId: string, enabled: boolean) => {
      try {
        const response = await fetch("/api/admin/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menuId, enabled }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update menu");
        }

        // ローカルの状態を更新
        setModulesData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            modules: prev.modules.map((m) => ({
              ...m,
              menus: m.menus.map((menu) =>
                menu.id === menuId ? { ...menu, enabled } : menu,
              ),
              menuCount: m.menus.filter((menu) =>
                menu.id === menuId ? enabled : menu.enabled,
              ).length,
            })),
          };
        });

        // 選択中のモジュールも更新
        setSelectedModule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            menus: prev.menus.map((menu) =>
              menu.id === menuId ? { ...menu, enabled } : menu,
            ),
            menuCount: prev.menus.filter((menu) =>
              menu.id === menuId ? enabled : menu.enabled,
            ).length,
          };
        });
      } catch (error) {
        console.error("Error toggling menu:", error);
        alert(
          t(
            error instanceof Error ? error.message : "Failed to update menu",
            error instanceof Error
              ? error.message
              : "メニューの更新に失敗しました",
          ),
        );
      }
    },
    [t],
  );

  // メニュー順序の更新
  const handleUpdateMenuOrder = useCallback(
    async (menuId: string, order: number) => {
      try {
        const response = await fetch("/api/admin/modules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menuId, order }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update menu order");
        }

        // ローカルの状態を更新
        setModulesData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            modules: prev.modules.map((m) => ({
              ...m,
              menus: m.menus.map((menu) =>
                menu.id === menuId ? { ...menu, order } : menu,
              ),
            })),
          };
        });

        // 選択中のモジュールも更新
        setSelectedModule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            menus: prev.menus.map((menu) =>
              menu.id === menuId ? { ...menu, order } : menu,
            ),
          };
        });
      } catch (error) {
        console.error("Error updating menu order:", error);
        alert(
          t(
            error instanceof Error
              ? error.message
              : "Failed to update menu order",
            error instanceof Error
              ? error.message
              : "メニュー順序の更新に失敗しました",
          ),
        );
      }
    },
    [t],
  );

  // MCPサーバAPIキー取得
  const fetchMcpApiKey = useCallback(
    async (mcpServerId: string) => {
      try {
        setMcpApiKeyLoading(true);
        // mcpServerIdからモジュール名を抽出（"organization-mcp" → "organization"）
        const moduleName = mcpServerId.replace(/-mcp$/, "");
        const response = await fetch(`/api/admin/mcp/${moduleName}`);
        if (!response.ok) return;
        const data = await response.json();
        setMcpApiKeyExists(data.exists);
        setMcpApiKeyMasked(data.maskedKey);
        setMcpApiKeyRevealed(null);
      } catch (error) {
        console.error("Error fetching MCP API key:", error);
      } finally {
        setMcpApiKeyLoading(false);
      }
    },
    [],
  );

  // MCPサーバAPIキー生成
  const generateMcpApiKey = useCallback(
    async (mcpServerId: string) => {
      try {
        setMcpApiKeyLoading(true);
        const moduleName = mcpServerId.replace(/-mcp$/, "");
        const response = await fetch(`/api/admin/mcp/${moduleName}`, {
          method: "POST",
        });
        if (!response.ok) throw new Error("Failed to generate API key");
        const data = await response.json();
        setMcpApiKeyExists(true);
        setMcpApiKeyRevealed(data.key);
        setMcpApiKeyMasked(null);
      } catch (error) {
        console.error("Error generating MCP API key:", error);
      } finally {
        setMcpApiKeyLoading(false);
      }
    },
    [],
  );

  // MCPサーバAPIキー削除
  const deleteMcpApiKey = useCallback(
    async (mcpServerId: string) => {
      try {
        setMcpApiKeyLoading(true);
        const moduleName = mcpServerId.replace(/-mcp$/, "");
        const response = await fetch(`/api/admin/mcp/${moduleName}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete API key");
        setMcpApiKeyExists(false);
        setMcpApiKeyMasked(null);
        setMcpApiKeyRevealed(null);
      } catch (error) {
        console.error("Error deleting MCP API key:", error);
      } finally {
        setMcpApiKeyLoading(false);
      }
    },
    [],
  );

  return (
    <Card className="h-full flex flex-col">
      {/* モジュール一覧画面 */}
      {!selectedModule && (
        <>
          {/* ローディング：初回はスケルトン、再読み込み時はスピナー */}
          {modulesLoading && !modulesData && <ModulesTabSkeletonContent />}
          {modulesLoading && modulesData && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <p className="mt-4 text-muted-foreground">
                  {t("Loading...", "読み込み中...")}
                </p>
              </div>
            </div>
          )}

          {/* モジュール一覧 */}
          {!modulesLoading && modulesData && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modulesData.modules.map((module) => (
                  <Card
                    key={module.id}
                    className={`hover:shadow-md transition-all ${
                      !module.enabled && "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      {/* トグルスイッチ */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={module.enabled}
                            onCheckedChange={(checked) =>
                              handleToggleModule(module.id, checked)
                            }
                            disabled={module.type === "core"}
                          />
                          <span
                            className={`text-sm font-medium ${module.enabled ? "text-green-700" : "text-muted-foreground"}`}
                          >
                            {module.enabled
                              ? t("Enabled", "有効")
                              : t("Disabled", "無効")}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            module.type === "core"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }
                        >
                          {module.type === "core" ? "Core" : "Addon"}
                        </Badge>
                      </div>

                      {/* モジュールヘッダー */}
                      <div
                        className="cursor-pointer"
                        onClick={() => { setSelectedModule(module); setMcpPanelOpen(false); }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                            {getModuleIcon(module.id, "w-5 h-5")}
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {language === "ja"
                                ? module.nameJa
                                : module.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {language === "ja"
                                ? module.name
                                : module.nameJa}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent
                      className="cursor-pointer"
                      onClick={() => { setSelectedModule(module); setMcpPanelOpen(false); }}
                    >
                      {/* モジュール説明 */}
                      {(language === "ja"
                        ? module.descriptionJa
                        : module.description) && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {language === "ja"
                            ? module.descriptionJa
                            : module.description}
                        </p>
                      )}

                      {/* モジュール情報 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("Menus", "メニュー数")}:
                          </span>
                          <span className="font-medium">
                            {module.menuCount}
                          </span>
                        </div>
                        {module.services?.length > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {t("Services", "サービス数")}:
                            </span>
                            <span className="font-medium">
                              {module.services.length}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* コンテナ・MCPサーバステータス（シンプル表示） */}
                      {(module.containers?.length > 0 ||
                        module.mcpServer) && (
                        <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
                          {/* コンテナステータス */}
                          {module.containers &&
                            module.containers.length > 0 &&
                            module.containers.map((container) => (
                              <div key={container.id} className="flex items-center gap-1.5 text-xs">
                                <svg
                                  className="w-3.5 h-3.5 text-muted-foreground"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                                  />
                                </svg>
                                <span className="text-muted-foreground">
                                  {language === "ja" && container.nameJa
                                    ? container.nameJa
                                    : container.name}
                                </span>
                                <span
                                  className={`flex items-center gap-1 ${container.isRunning ? "text-green-600" : "text-amber-600"}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${container.isRunning ? "bg-green-500" : "bg-amber-500"}`}
                                  />
                                  {container.isRunning
                                    ? t("Running", "稼働中")
                                    : t("Stopped", "停止中")}
                                  {!container.isRunning && container.required && (
                                    <span>⚠️</span>
                                  )}
                                </span>
                              </div>
                            ))}

                          {/* MCPサーバー */}
                          {module.mcpServer && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <svg
                                className="w-3.5 h-3.5 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="text-muted-foreground">
                                {t("MCP", "MCP")}
                              </span>
                              <span className="text-blue-600">
                                {module.mcpServer.toolCount}{" "}
                                {t("tools", "ツール")}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* モジュールID */}
                      <div className="mt-4 pt-4 border-t">
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {module.id}
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* モジュール詳細画面 */}
      {selectedModule && (
        <div className="h-full flex flex-col">
          {/* ヘッダー */}
          <div className="p-6 border-b flex-shrink-0 flex items-center gap-4">
            <BackButton onClick={() => setSelectedModule(null)} />
            <div className="flex-shrink-0 w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
              {getModuleIcon(selectedModule.id, "w-7 h-7")}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {language === "ja"
                  ? selectedModule.nameJa
                  : selectedModule.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {language === "ja"
                  ? selectedModule.name
                  : selectedModule.nameJa}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* モジュール情報 */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {t("Type", "タイプ")}
                </h3>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedModule.type === "core"
                      ? "bg-green-100 text-green-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {selectedModule.type === "core"
                    ? "Core Module"
                    : "Addon Module"}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {t("Status", "ステータス")}
                </h3>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedModule.enabled
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {selectedModule.enabled
                    ? t("Enabled", "有効")
                    : t("Disabled", "無効")}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {t("Description", "説明")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {(language === "ja"
                    ? selectedModule.descriptionJa
                    : selectedModule.description) || t("None", "なし")}
                </p>
              </div>
            </div>

            {/* モジュールID・依存モジュール */}
            <div className="mb-6">
              {selectedModule.dependencies && selectedModule.dependencies.length > 0 ? (
                <div className="flex items-start gap-8">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {t("Module ID", "モジュールID")}
                    </h3>
                    <code className="text-sm bg-muted px-3 py-2 rounded block">
                      {selectedModule.id}
                    </code>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {t("Dependencies", "依存モジュール")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedModule.dependencies.map((depId) => {
                        const depModule = modulesData?.modules.find((m) => m.id === depId);
                        return (
                          <span
                            key={depId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                depModule?.enabled ? "bg-green-500" : "bg-gray-400"
                              }`}
                            />
                            {depModule
                              ? (language === "ja" ? depModule.nameJa : depModule.name)
                              : depId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    {t("Module ID", "モジュールID")}
                  </h3>
                  <code className="text-sm bg-muted px-3 py-2 rounded block">
                    {selectedModule.id}
                  </code>
                </>
              )}
            </div>

            {/* MCPサーバー詳細（折り畳み可能） */}
            {selectedModule.mcpServer && (
              <div className="mb-6 bg-muted border border-border rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    const next = !mcpPanelOpen;
                    setMcpPanelOpen(next);
                    if (next && selectedModule.mcpServer) {
                      fetchMcpApiKey(selectedModule.mcpServer.id);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-accent/50 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold">
                      {language === "ja"
                        ? selectedModule.mcpServer.nameJa
                        : selectedModule.mcpServer.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "MCP Server for external AI integration",
                        "外部AI連携用MCPサーバ",
                      )}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      mcpPanelOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {mcpPanelOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* 説明 */}
                    {(language === "ja"
                      ? selectedModule.mcpServer.descriptionJa
                      : selectedModule.mcpServer.description) && (
                      <div className="p-3 bg-card rounded-lg border border-border">
                        <p className="text-sm font-medium mb-1">
                          {t("Description", "説明")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language === "ja"
                            ? selectedModule.mcpServer.descriptionJa
                            : selectedModule.mcpServer.description}
                        </p>
                      </div>
                    )}

                    {/* ツール一覧 */}
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <p className="text-sm font-medium mb-2">
                        {t("Tools", "ツール")} (
                        {selectedModule.mcpServer.toolCount})
                      </p>
                      <div className="space-y-1.5">
                        {selectedModule.mcpServer.tools.map((tool) => (
                          <div
                            key={tool.name}
                            className="flex items-center gap-2 text-xs"
                          >
                            <code className="text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">
                              {tool.name}
                            </code>
                            <span className="text-muted-foreground">
                              {tool.descriptionJa}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* アクセスモード */}
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <p className="text-sm font-medium mb-1">
                        {t("Access Mode", "アクセスモード")}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          selectedModule.mcpServer.readOnly
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                        }`}
                      >
                        {selectedModule.mcpServer.readOnly
                          ? t("Read Only", "読み取り専用")
                          : t("Read/Write", "読み書き可能")}
                      </span>
                    </div>

                    {/* パス */}
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <p className="text-sm font-medium mb-1">
                        {t("Server Path", "サーバパス")}
                      </p>
                      <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                        {selectedModule.mcpServer.path}
                      </code>
                    </div>

                    {/* APIキー管理 */}
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {t("API Key", "APIキー")}
                        </p>
                      </div>

                      {mcpApiKeyLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          {t("Loading...", "読み込み中...")}
                        </div>
                      ) : mcpApiKeyRevealed ? (
                        /* 生成直後: キー全文を表示 */
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs font-mono bg-muted px-2 py-1.5 rounded break-all select-all">
                              {mcpApiKeyRevealed}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-8 w-8 p-0"
                              onClick={async () => {
                                await navigator.clipboard.writeText(
                                  mcpApiKeyRevealed,
                                );
                                setMcpApiKeyCopied(true);
                                setTimeout(
                                  () => setMcpApiKeyCopied(false),
                                  2000,
                                );
                              }}
                            >
                              {mcpApiKeyCopied ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {t(
                              "Copy the key now. It will not be shown again.",
                              "このキーを今すぐコピーしてください。再表示はできません。",
                            )}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (selectedModule.mcpServer) {
                                  generateMcpApiKey(
                                    selectedModule.mcpServer.id,
                                  );
                                }
                              }}
                              disabled={mcpApiKeyLoading}
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                              {t("Regenerate", "再生成")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (selectedModule.mcpServer) {
                                  deleteMcpApiKey(
                                    selectedModule.mcpServer.id,
                                  );
                                }
                              }}
                              disabled={mcpApiKeyLoading}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                              {t("Delete", "削除")}
                            </Button>
                          </div>
                        </div>
                      ) : mcpApiKeyExists ? (
                        /* 既存キー: マスク表示 */
                        <div className="space-y-2">
                          <code className="block text-xs font-mono bg-muted px-2 py-1.5 rounded text-muted-foreground">
                            {mcpApiKeyMasked}
                          </code>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (selectedModule.mcpServer) {
                                  generateMcpApiKey(
                                    selectedModule.mcpServer.id,
                                  );
                                }
                              }}
                              disabled={mcpApiKeyLoading}
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                              {t("Regenerate", "再生成")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (selectedModule.mcpServer) {
                                  deleteMcpApiKey(
                                    selectedModule.mcpServer.id,
                                  );
                                }
                              }}
                              disabled={mcpApiKeyLoading}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                              {t("Delete", "削除")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* キー未発行 */
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {t(
                              "No API key has been generated. Generate one to use with the MCP server.",
                              "APIキーが未発行です。MCPサーバの利用にはキーを発行してください。",
                            )}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (selectedModule.mcpServer) {
                                generateMcpApiKey(
                                  selectedModule.mcpServer.id,
                                );
                              }
                            }}
                            disabled={mcpApiKeyLoading}
                          >
                            <Key className="w-3.5 h-3.5 mr-1.5" />
                            {t("Generate API Key", "APIキーを発行")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* メニュー一覧 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t("Menus", "メニュー")} ({selectedModule.menuCount})
              </h3>
              {selectedModule.menus.length > 0 ? (
                <div className="space-y-2">
                  {selectedModule.menus
                    .sort((a, b) => a.order - b.order)
                    .map((menu) => (
                      <div
                        key={menu.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {language === "ja"
                              ? menu.nameJa
                              : menu.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {language === "ja"
                              ? menu.name
                              : menu.nameJa}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {menu.path}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* ロールバッジ */}
                          <div className="flex gap-1">
                            {menu.requiredRoles.map((role) => (
                              <span
                                key={role}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  role === "ADMIN"
                                    ? "bg-red-100 text-red-700"
                                    : role === "EXECUTIVE"
                                      ? "bg-rose-100 text-rose-700"
                                      : role === "MANAGER"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            {menu.menuGroup}
                          </span>
                          {/* 順序入力 */}
                          <Input
                            type="number"
                            value={menu.order}
                            onChange={(e) => {
                              const newOrder = parseInt(
                                e.target.value,
                                10,
                              );
                              if (!Number.isNaN(newOrder)) {
                                handleUpdateMenuOrder(
                                  menu.id,
                                  newOrder,
                                );
                              }
                            }}
                            className="w-16 h-7 text-xs text-center"
                            min={0}
                            max={999}
                          />
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={menu.enabled}
                              onCheckedChange={(checked) =>
                                handleToggleMenu(menu.id, checked)
                              }
                              className="scale-75"
                            />
                            <span
                              className={`text-xs ${menu.enabled ? "text-green-700" : "text-muted-foreground"}`}
                            >
                              {menu.enabled
                                ? t("Enabled", "有効")
                                : t("Disabled", "無効")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t("No menus", "メニューがありません")}
                </p>
              )}
            </div>

            {/* サービス一覧（折りたたみ） */}
            {selectedModule.services?.length > 0 && (
              <div className="mb-6">
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2"
                  onClick={() =>
                    setExpandedServices((prev) => ({
                      ...prev,
                      [selectedModule.id]:
                        !prev[selectedModule.id],
                    }))
                  }
                >
                  {expandedServices[selectedModule.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {t("Services", "サービス")} (
                  {selectedModule.services.length})
                </button>
                {expandedServices[selectedModule.id] && (
                  <div className="space-y-2">
                    {selectedModule.services.map((service) => (
                      <div
                        key={service.id}
                        className="p-3 bg-muted rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {language === "ja"
                                ? service.nameJa
                                : service.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {language === "ja"
                                ? service.name
                                : service.nameJa}
                            </p>
                            {(language === "ja"
                              ? service.descriptionJa
                              : service.description) && (
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                {language === "ja"
                                  ? service.descriptionJa
                                  : service.description}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-xs ${service.enabled ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}
                          >
                            {service.enabled
                              ? t("Enabled", "有効")
                              : t("Disabled", "無効")}
                          </span>
                        </div>
                        {service.apiEndpoints.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {service.apiEndpoints.map((endpoint) => (
                              <code
                                key={endpoint}
                                className="text-xs bg-background px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                              >
                                {endpoint}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* コアモジュール注意事項 */}
            {selectedModule.type === "core" && (
              <div className="mt-6 p-4 bg-muted border border-border rounded-lg">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-muted-foreground mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      {t("Core Module", "コアモジュール")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "This is a core module and cannot be disabled.",
                        "このモジュールはコアモジュールのため、無効化できません。",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
