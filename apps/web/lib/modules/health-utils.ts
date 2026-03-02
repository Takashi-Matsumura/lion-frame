import type {
  ContainerHealthDetail,
  ModuleHealthResult,
  ModuleHealthStatus,
  ModuleImpact,
} from "@/types/admin";
import type { AppModule } from "@/types/module";

/**
 * 逆依存マップを構築する
 * key: モジュールID, value: そのモジュールに依存しているモジュールIDの集合
 * BFSで推移的依存（A→B→C のとき A に影響があれば C にも波及）も解決する
 */
export function buildReverseDependencyMap(
  modules: AppModule[],
): Map<string, Set<string>> {
  // 直接逆依存を構築
  const directReverse = new Map<string, Set<string>>();
  for (const mod of modules) {
    if (!directReverse.has(mod.id)) {
      directReverse.set(mod.id, new Set());
    }
    for (const depId of mod.dependencies ?? []) {
      if (!directReverse.has(depId)) {
        directReverse.set(depId, new Set());
      }
      directReverse.get(depId)!.add(mod.id);
    }
  }

  // BFSで推移的逆依存を解決
  const transitiveReverse = new Map<string, Set<string>>();
  for (const sourceId of directReverse.keys()) {
    const visited = new Set<string>();
    const queue = [...(directReverse.get(sourceId) ?? [])];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of directReverse.get(current) ?? []) {
        queue.push(next);
      }
    }
    transitiveReverse.set(sourceId, visited);
  }

  return transitiveReverse;
}

/**
 * ヘルス状態を判定する
 */
export function determineHealthStatus(
  enabled: boolean,
  containers: ContainerHealthDetail[],
): { status: ModuleHealthStatus; reason: string; reasonJa: string } {
  if (!enabled) {
    return {
      status: "stopped",
      reason: "Module is disabled",
      reasonJa: "モジュールが無効になっています",
    };
  }

  const requiredContainers = containers.filter((c) => c.required);
  const optionalContainers = containers.filter((c) => !c.required);

  const requiredDown = requiredContainers.filter((c) => !c.isRunning);
  const optionalDown = optionalContainers.filter((c) => !c.isRunning);

  if (requiredDown.length > 0) {
    const names = requiredDown.map((c) => c.nameJa).join("、");
    const namesEn = requiredDown.map((c) => c.name).join(", ");
    return {
      status: "stopped",
      reason: `Required container down: ${namesEn}`,
      reasonJa: `必須コンテナが停止しています: ${names}`,
    };
  }

  if (optionalDown.length > 0) {
    const names = optionalDown.map((c) => c.nameJa).join("、");
    const namesEn = optionalDown.map((c) => c.name).join(", ");
    return {
      status: "degraded",
      reason: `Optional container down: ${namesEn}. Some features may be limited`,
      reasonJa: `オプションコンテナ（${names}）が停止しています。一部機能が制限されます`,
    };
  }

  return {
    status: "healthy",
    reason: "All systems operational",
    reasonJa: "正常に稼働中",
  };
}

/**
 * 非正常モジュールの影響分析を行う
 */
export function computeImpacts(
  allModules: AppModule[],
  healthResults: ModuleHealthResult[],
  moduleEnabledOverrides: Record<string, boolean>,
): ModuleImpact[] {
  const reverseMap = buildReverseDependencyMap(allModules);
  const moduleMap = new Map(allModules.map((m) => [m.id, m]));
  const unhealthy = healthResults.filter((r) => r.status !== "healthy");

  return unhealthy.map((health) => {
    const sourceModule = moduleMap.get(health.moduleId)!;
    const dependentIds = reverseMap.get(health.moduleId) ?? new Set();

    // 影響を受けるモジュール
    const affectedModules = [...dependentIds]
      .map((id) => moduleMap.get(id))
      .filter((m): m is AppModule => m !== undefined)
      .map((m) => ({ id: m.id, nameJa: m.nameJa }));

    // 影響を受けるメニュー（自身 + 依存モジュール）
    const affectedMenuIds = new Set<string>();
    const affectedMenus: ModuleImpact["affectedMenus"] = [];
    for (const mod of [sourceModule, ...[...dependentIds].map((id) => moduleMap.get(id)).filter(Boolean) as AppModule[]]) {
      const isEnabled = moduleEnabledOverrides[mod.id] ?? mod.enabled;
      if (!isEnabled) continue;
      for (const menu of mod.menus) {
        if (!affectedMenuIds.has(menu.id) && menu.enabled) {
          affectedMenuIds.add(menu.id);
          affectedMenus.push({
            id: menu.id,
            nameJa: menu.nameJa,
            path: menu.path,
            menuGroup: menu.menuGroup,
          });
        }
      }
    }

    // 影響を受けるサービス
    const affectedServices: ModuleImpact["affectedServices"] = [];
    for (const mod of [sourceModule, ...[...dependentIds].map((id) => moduleMap.get(id)).filter(Boolean) as AppModule[]]) {
      for (const service of mod.services ?? []) {
        if (service.enabled) {
          affectedServices.push({ id: service.id, nameJa: service.nameJa });
        }
      }
    }

    const statusLabelJa = health.status === "stopped" ? "停止中" : "機能低下中";
    const statusLabelEn = health.status === "stopped" ? "stopped" : "degraded";

    const summaryJa = buildSummaryJa(health, affectedMenus);
    const summary = buildSummaryEn(health, affectedMenus);

    return {
      sourceModuleId: health.moduleId,
      sourceModuleNameJa: health.moduleNameJa,
      sourceStatus: health.status,
      affectedModules,
      affectedMenus,
      affectedServices,
      summaryJa,
      summary,
    };
  });
}

/**
 * 管理者向け日本語サマリーを生成する
 */
function buildSummaryJa(
  health: ModuleHealthResult,
  affectedMenus: ModuleImpact["affectedMenus"],
): string {
  const statusLabel = health.status === "stopped" ? "停止中" : "機能低下中";
  const menuNames = affectedMenus.map((m) => m.nameJa).join("、");
  const menuPart =
    affectedMenus.length > 0
      ? `利用できないメニュー: ${menuNames}`
      : "影響を受けるメニューはありません";

  return `「${health.moduleNameJa}」モジュールが${statusLabel}です。${health.reasonJa}。${menuPart}`;
}

/**
 * English summary for audit log
 */
function buildSummaryEn(
  health: ModuleHealthResult,
  affectedMenus: ModuleImpact["affectedMenus"],
): string {
  const menuNames = affectedMenus.map((m) => m.nameJa).join(", ");
  const menuPart =
    affectedMenus.length > 0
      ? `Affected menus: ${menuNames}`
      : "No menus affected";

  return `Module "${health.moduleName}" is ${health.status}. ${health.reason}. ${menuPart}`;
}
