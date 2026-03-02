import { apiHandler } from "@/lib/api";
import { CORE_MODULE_IDS } from "@/lib/modules/constants";
import {
  computeImpacts,
  determineHealthStatus,
} from "@/lib/modules/health-utils";
import { moduleRegistry } from "@/lib/modules/registry";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import type {
  ContainerHealthDetail,
  ModuleHealthCheckResponse,
  ModuleHealthResult,
} from "@/types/admin";

const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * コンテナのヘルスチェックを実行する
 * healthCheckUrl が /api/ で始まる場合は内部APIとして処理
 */
async function checkContainerHealth(
  containerId: string,
  healthCheckUrl: string,
): Promise<{ isRunning: boolean; responseTimeMs: number }> {
  const start = performance.now();
  try {
    switch (containerId) {
      case "postgres":
      case "postgresql": {
        await prisma.$queryRaw`SELECT 1`;
        return { isRunning: true, responseTimeMs: Math.round(performance.now() - start) };
      }
      default: {
        // healthCheckUrl を使ったHTTPチェック
        if (!healthCheckUrl) {
          return { isRunning: true, responseTimeMs: 0 };
        }

        // 内部APIパスの場合はサーバー内で直接フェッチ
        const url = healthCheckUrl.startsWith("http")
          ? healthCheckUrl
          : `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${healthCheckUrl}`;

        const res = await fetch(url, {
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        });
        const elapsed = Math.round(performance.now() - start);
        return { isRunning: res.ok, responseTimeMs: elapsed };
      }
    }
  } catch {
    return {
      isRunning: false,
      responseTimeMs: Math.round(performance.now() - start),
    };
  }
}

export const GET = apiHandler(async (_request, session) => {
  const overallStart = performance.now();

  // モジュール有効状態のオーバーライドを取得
  const moduleEnabledSettings = await prisma.systemSetting.findMany({
    where: { key: { startsWith: "module_enabled_" } },
  });
  const moduleEnabledOverrides: Record<string, boolean> = {};
  for (const setting of moduleEnabledSettings) {
    const moduleId = setting.key.replace("module_enabled_", "");
    moduleEnabledOverrides[moduleId] = setting.value === "true";
  }

  const allModules = Object.values(moduleRegistry);

  // 各モジュールのヘルスチェックを並列実行
  const healthResults: ModuleHealthResult[] = await Promise.all(
    allModules.map(async (module) => {
      const moduleStart = performance.now();
      const isEnabled = moduleEnabledOverrides[module.id] ?? module.enabled;
      const isCore = CORE_MODULE_IDS.has(module.id);

      // コンテナヘルスチェック
      const containers: ContainerHealthDetail[] = module.containers
        ? await Promise.all(
            module.containers.map(async (container) => {
              const { isRunning, responseTimeMs } = await checkContainerHealth(
                container.id,
                container.healthCheckUrl,
              );
              return {
                id: container.id,
                name: container.name,
                nameJa: container.nameJa,
                required: container.required,
                isRunning,
                responseTimeMs,
              };
            }),
          )
        : [];

      const { status, reason, reasonJa } = determineHealthStatus(
        isEnabled,
        containers,
      );

      return {
        moduleId: module.id,
        moduleName: module.name,
        moduleNameJa: module.nameJa,
        status,
        enabled: isEnabled,
        type: isCore ? ("core" as const) : ("addon" as const),
        reason,
        reasonJa,
        containers,
        checkedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - moduleStart),
      };
    }),
  );

  // 影響分析
  const impacts = computeImpacts(allModules, healthResults, moduleEnabledOverrides);

  // サマリー計算
  const summary = {
    total: healthResults.length,
    healthy: healthResults.filter((r) => r.status === "healthy").length,
    degraded: healthResults.filter((r) => r.status === "degraded").length,
    stopped: healthResults.filter((r) => r.status === "stopped").length,
  };

  const totalDurationMs = Math.round(performance.now() - overallStart);

  // 監査ログ記録
  await AuditService.log({
    action: "MODULE_HEALTH_CHECK",
    category: "MODULE",
    userId: session.user.id,
    details: {
      summary,
      totalDurationMs,
      unhealthyModules: healthResults
        .filter((r) => r.status !== "healthy")
        .map((r) => ({ id: r.moduleId, status: r.status, reason: r.reason })),
    },
  }).catch(() => {});

  const response: ModuleHealthCheckResponse = {
    modules: healthResults,
    impacts,
    summary,
    timestamp: new Date().toISOString(),
    totalDurationMs,
  };

  return response;
}, { admin: true });
