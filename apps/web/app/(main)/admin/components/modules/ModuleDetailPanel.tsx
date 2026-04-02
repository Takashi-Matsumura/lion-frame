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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getModuleIcon } from "@/lib/modules/icons";
import type { ModulesData, ModuleInfo } from "@/types/admin";

interface ModuleDetailPanelProps {
  module: ModuleInfo;
  modulesData: ModulesData;
  language: "en" | "ja";
  onToggleMenu: (menuId: string, enabled: boolean) => void;
  onUpdateMenuOrder: (menuId: string, order: number) => void;
  // MCP
  mcpPanelOpen: boolean;
  onToggleMcpPanel: () => void;
  mcpApiKeyExists: boolean;
  mcpApiKeyMasked: string | null;
  mcpApiKeyRevealed: string | null;
  mcpApiKeyLoading: boolean;
  mcpApiKeyCopied: boolean;
  onFetchMcpApiKey: (mcpServerId: string) => void;
  onGenerateMcpApiKey: (mcpServerId: string) => void;
  onDeleteMcpApiKey: (mcpServerId: string) => void;
  onCopyMcpApiKey: (key: string) => void;
  // Services
  expandedServices: Record<string, boolean>;
  onToggleServiceExpanded: (moduleId: string) => void;
}

export function ModuleDetailPanel({
  module: selectedModule,
  modulesData,
  language,
  onToggleMenu,
  onUpdateMenuOrder,
  mcpPanelOpen,
  onToggleMcpPanel,
  mcpApiKeyExists,
  mcpApiKeyMasked,
  mcpApiKeyRevealed,
  mcpApiKeyLoading,
  mcpApiKeyCopied,
  onFetchMcpApiKey,
  onGenerateMcpApiKey,
  onDeleteMcpApiKey,
  onCopyMcpApiKey,
  expandedServices,
  onToggleServiceExpanded,
}: ModuleDetailPanelProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b flex-shrink-0 flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
          {getModuleIcon(selectedModule.id, "w-5 h-5")}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate">
            {language === "ja" ? selectedModule.nameJa : selectedModule.name}
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            {language === "ja" ? selectedModule.name : selectedModule.nameJa}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* 説明 */}
        {(language === "ja"
          ? selectedModule.descriptionJa
          : selectedModule.description) && (
          <p className="text-sm text-muted-foreground mb-4">
            {language === "ja"
              ? selectedModule.descriptionJa
              : selectedModule.description}
          </p>
        )}

        {/* モジュールID */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">
            {t("Module ID", "モジュールID")}
          </h3>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {selectedModule.id}
          </code>
        </div>

        {/* 依存モジュール */}
        {selectedModule.dependencies && selectedModule.dependencies.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-1">
              {t("Dependencies", "依存モジュール")}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {selectedModule.dependencies.map((depId) => {
                const depModule = modulesData.modules.find((m) => m.id === depId);
                return (
                  <span
                    key={depId}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
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
        )}

        {/* コンテナステータス */}
        {selectedModule.containers && selectedModule.containers.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-1">
              {t("Containers", "コンテナ")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedModule.containers.map((container) => (
                <div key={container.id} className="flex items-center gap-1.5 text-xs px-2 py-1 bg-muted rounded-md">
                  <span className="text-muted-foreground">
                    {language === "ja" && container.nameJa
                      ? container.nameJa
                      : container.name}
                  </span>
                  <span
                    className={`flex items-center gap-1 ${container.isRunning ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${container.isRunning ? "bg-green-500" : "bg-amber-500"}`}
                    />
                    {container.isRunning
                      ? t("Running", "稼働中")
                      : t("Stopped", "停止中")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MCPサーバー詳細（折り畳み可能） */}
        {selectedModule.mcpServer && (
          <div className="mb-4 bg-muted border border-border rounded-lg">
            <button
              type="button"
              onClick={() => {
                onToggleMcpPanel();
                if (!mcpPanelOpen && selectedModule.mcpServer) {
                  onFetchMcpApiKey(selectedModule.mcpServer.id);
                }
              }}
              className="w-full flex items-center gap-2 p-3 text-left cursor-pointer hover:bg-accent/50 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                <svg
                  className="w-4 h-4"
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
                <h4 className="text-xs font-semibold">
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
              <div className="px-3 pb-3 space-y-2">
                {/* 説明 */}
                {(language === "ja"
                  ? selectedModule.mcpServer.descriptionJa
                  : selectedModule.mcpServer.description) && (
                  <div className="p-2 bg-card rounded-lg border border-border">
                    <p className="text-xs font-medium mb-0.5">
                      {t("Description", "説明")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === "ja"
                        ? selectedModule.mcpServer.descriptionJa
                        : selectedModule.mcpServer.description}
                    </p>
                  </div>
                )}

                {/* ツール一覧 */}
                <div className="p-2 bg-card rounded-lg border border-border">
                  <p className="text-xs font-medium mb-1.5">
                    {t("Tools", "ツール")} (
                    {selectedModule.mcpServer.toolCount})
                  </p>
                  <div className="space-y-1">
                    {selectedModule.mcpServer.tools.map((tool) => (
                      <div
                        key={tool.name}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <code className="text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 px-1 py-0.5 rounded font-mono text-[11px]">
                          {tool.name}
                        </code>
                        <span className="text-muted-foreground text-[11px]">
                          {tool.descriptionJa}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* アクセスモード */}
                <div className="p-2 bg-card rounded-lg border border-border">
                  <p className="text-xs font-medium mb-0.5">
                    {t("Access Mode", "アクセスモード")}
                  </p>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
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
                <div className="p-2 bg-card rounded-lg border border-border">
                  <p className="text-xs font-medium mb-0.5">
                    {t("Server Path", "サーバパス")}
                  </p>
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {selectedModule.mcpServer.path}
                  </code>
                </div>

                {/* APIキー管理 */}
                <div className="p-2 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Key className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium">
                      {t("API Key", "APIキー")}
                    </p>
                  </div>

                  {mcpApiKeyLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      {t("Loading...", "読み込み中...")}
                    </div>
                  ) : mcpApiKeyRevealed ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 text-[11px] font-mono bg-muted px-1.5 py-1 rounded break-all select-all">
                          {mcpApiKeyRevealed}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-7 w-7 p-0"
                          onClick={async () => {
                            onCopyMcpApiKey(mcpApiKeyRevealed);
                          }}
                        >
                          {mcpApiKeyCopied ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        {t(
                          "Copy the key now. It will not be shown again.",
                          "このキーを今すぐコピーしてください。再表示はできません。",
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            if (selectedModule.mcpServer) {
                              onGenerateMcpApiKey(selectedModule.mcpServer.id);
                            }
                          }}
                          disabled={mcpApiKeyLoading}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          {t("Regenerate", "再生成")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => {
                            if (selectedModule.mcpServer) {
                              onDeleteMcpApiKey(selectedModule.mcpServer.id);
                            }
                          }}
                          disabled={mcpApiKeyLoading}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          {t("Delete", "削除")}
                        </Button>
                      </div>
                    </div>
                  ) : mcpApiKeyExists ? (
                    <div className="space-y-1.5">
                      <code className="block text-[11px] font-mono bg-muted px-1.5 py-1 rounded text-muted-foreground">
                        {mcpApiKeyMasked}
                      </code>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            if (selectedModule.mcpServer) {
                              onGenerateMcpApiKey(selectedModule.mcpServer.id);
                            }
                          }}
                          disabled={mcpApiKeyLoading}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          {t("Regenerate", "再生成")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => {
                            if (selectedModule.mcpServer) {
                              onDeleteMcpApiKey(selectedModule.mcpServer.id);
                            }
                          }}
                          disabled={mcpApiKeyLoading}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          {t("Delete", "削除")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-muted-foreground">
                        {t(
                          "No API key has been generated.",
                          "APIキーが未発行です。",
                        )}
                      </p>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          if (selectedModule.mcpServer) {
                            onGenerateMcpApiKey(selectedModule.mcpServer.id);
                          }
                        }}
                        disabled={mcpApiKeyLoading}
                      >
                        <Key className="w-3 h-3 mr-1" />
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
        <div className="mb-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">
            {t("Menus", "メニュー")} ({selectedModule.menuCount})
          </h3>
          {selectedModule.menus.length > 0 ? (
            <div className="space-y-1.5">
              {selectedModule.menus
                .sort((a, b) => a.order - b.order)
                .map((menu) => (
                  <div
                    key={menu.id}
                    className="p-2 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {language === "ja" ? menu.nameJa : menu.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {menu.path}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* ロールバッジ */}
                        <div className="flex gap-0.5">
                          {menu.requiredRoles.map((role) => (
                            <span
                              key={role}
                              className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium ${
                                role === "ADMIN"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : role === "EXECUTIVE"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                    : role === "MANAGER"
                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              }`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                          {menu.menuGroup}
                        </span>
                        {/* 順序入力 */}
                        <Input
                          type="number"
                          value={menu.order}
                          onChange={(e) => {
                            const newOrder = parseInt(e.target.value, 10);
                            if (!Number.isNaN(newOrder)) {
                              onUpdateMenuOrder(menu.id, newOrder);
                            }
                          }}
                          className="w-14 h-6 text-[11px] text-center"
                          min={0}
                          max={999}
                        />
                        <div className="flex items-center gap-0.5">
                          <Switch
                            checked={menu.enabled}
                            onCheckedChange={(checked) =>
                              onToggleMenu(menu.id, checked)
                            }
                            className="scale-[0.65]"
                          />
                          <span
                            className={`text-[10px] ${menu.enabled ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}
                          >
                            {menu.enabled
                              ? t("ON", "有効")
                              : t("OFF", "無効")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {t("No menus", "メニューがありません")}
            </p>
          )}
        </div>

        {/* サービス一覧（折りたたみ） */}
        {selectedModule.services?.length > 0 && (
          <div className="mb-4">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-1.5"
              onClick={() => onToggleServiceExpanded(selectedModule.id)}
            >
              {expandedServices[selectedModule.id] ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {t("Services", "サービス")} (
              {selectedModule.services.length})
            </button>
            {expandedServices[selectedModule.id] && (
              <div className="space-y-1.5">
                {selectedModule.services.map((service) => (
                  <div
                    key={service.id}
                    className="p-2 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {language === "ja"
                            ? service.nameJa
                            : service.name}
                        </p>
                        {(language === "ja"
                          ? service.descriptionJa
                          : service.description) && (
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                            {language === "ja"
                              ? service.descriptionJa
                              : service.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] shrink-0 ${service.enabled ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}
                      >
                        {service.enabled
                          ? t("Enabled", "有効")
                          : t("Disabled", "無効")}
                      </span>
                    </div>
                    {service.apiEndpoints.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {service.apiEndpoints.map((endpoint) => (
                          <code
                            key={endpoint}
                            className="text-[10px] bg-background px-1 py-0.5 rounded border border-border text-muted-foreground"
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
          <div className="p-3 bg-muted border border-border rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0"
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
                <h4 className="text-xs font-medium mb-0.5">
                  {t("Core Module", "コアモジュール")}
                </h4>
                <p className="text-xs text-muted-foreground">
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
  );
}
