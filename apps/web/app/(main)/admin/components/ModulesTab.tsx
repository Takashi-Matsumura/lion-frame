"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ModulesData, ModuleInfo } from "@/types/admin";
import { ModuleTable, ModuleDetailPanel } from "./modules";
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

  // modulesData 更新時に selectedModule を同期
  useEffect(() => {
    if (selectedModule && modulesData) {
      const updated = modulesData.modules.find(
        (m) => m.id === selectedModule.id,
      );
      if (updated) {
        setSelectedModule(updated);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesData]);

  // モジュール選択/解除
  const handleSelectModule = useCallback((module: ModuleInfo) => {
    setSelectedModule((prev) => {
      if (prev?.id === module.id) {
        return null;
      }
      setMcpPanelOpen(false);
      return module;
    });
  }, []);

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
  const fetchMcpApiKey = useCallback(async (mcpServerId: string) => {
    try {
      setMcpApiKeyLoading(true);
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
  }, []);

  // MCPサーバAPIキー生成
  const generateMcpApiKey = useCallback(async (mcpServerId: string) => {
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
  }, []);

  // MCPサーバAPIキー削除
  const deleteMcpApiKey = useCallback(async (mcpServerId: string) => {
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
  }, []);

  // MCPキーコピー
  const handleCopyMcpApiKey = useCallback(async (key: string) => {
    await navigator.clipboard.writeText(key);
    setMcpApiKeyCopied(true);
    setTimeout(() => setMcpApiKeyCopied(false), 2000);
  }, []);

  // サービス展開トグル
  const handleToggleServiceExpanded = useCallback((moduleId: string) => {
    setExpandedServices((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  }, []);

  return (
    <Card className="h-full flex flex-col">
      {/* ローディング */}
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

      {/* メインコンテンツ: テーブル + 詳細パネル */}
      {!modulesLoading && modulesData && (
        <div className="flex-1 flex min-h-0">
          {/* 左: テーブル */}
          <div
            className={cn(
              "flex flex-col min-h-0 overflow-y-auto transition-all duration-200",
              selectedModule ? "w-[42%] border-r" : "w-full",
            )}
          >
            <ModuleTable
              modules={modulesData.modules}
              selectedModuleId={selectedModule?.id ?? null}
              language={language}
              onSelectModule={handleSelectModule}
              onToggleModule={handleToggleModule}
            />
          </div>

          {/* 右: 詳細パネル */}
          {selectedModule && (
            <div className="w-[58%] flex flex-col min-h-0">
              <ModuleDetailPanel
                module={selectedModule}
                modulesData={modulesData}
                language={language}
                onToggleMenu={handleToggleMenu}
                onUpdateMenuOrder={handleUpdateMenuOrder}
                mcpPanelOpen={mcpPanelOpen}
                onToggleMcpPanel={() => setMcpPanelOpen((v) => !v)}
                mcpApiKeyExists={mcpApiKeyExists}
                mcpApiKeyMasked={mcpApiKeyMasked}
                mcpApiKeyRevealed={mcpApiKeyRevealed}
                mcpApiKeyLoading={mcpApiKeyLoading}
                mcpApiKeyCopied={mcpApiKeyCopied}
                onFetchMcpApiKey={fetchMcpApiKey}
                onGenerateMcpApiKey={generateMcpApiKey}
                onDeleteMcpApiKey={deleteMcpApiKey}
                onCopyMcpApiKey={handleCopyMcpApiKey}
                expandedServices={expandedServices}
                onToggleServiceExpanded={handleToggleServiceExpanded}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
