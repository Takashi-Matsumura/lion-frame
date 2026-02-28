import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";
import { cleanVersion, isOutdated as checkOutdated } from "./semver-utils";

/** チェック対象パッケージ（主要フレームワーク＋セキュリティ関連） */
const TARGET_PACKAGES = [
  "next",
  "react",
  "@prisma/client",
  "next-auth",
  "tailwindcss",
  "typescript",
  "zustand",
  "date-fns",
  "bcryptjs",
  "lucide-react",
  "prisma",
] as const;

interface PackageJsonDeps {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface NpmRegistryResponse {
  "dist-tags"?: { latest?: string };
}

interface GitHubAdvisory {
  ghsa_id: string;
  severity: string;
  summary: string;
  html_url: string;
  vulnerabilities: Array<{
    package: { ecosystem: string; name: string };
    vulnerable_version_range: string;
  }>;
}

/** package.json から対象パッケージの現在バージョンを取得 */
export async function readCurrentVersions(): Promise<
  Array<{ name: string; version: string; isDev: boolean }>
> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const pkgPath = path.join(process.cwd(), "package.json");
  const raw = await fs.readFile(pkgPath, "utf-8");
  const pkg: PackageJsonDeps = JSON.parse(raw);

  const results: Array<{ name: string; version: string; isDev: boolean }> = [];

  for (const name of TARGET_PACKAGES) {
    if (pkg.dependencies?.[name]) {
      results.push({
        name,
        version: cleanVersion(pkg.dependencies[name]),
        isDev: false,
      });
    } else if (pkg.devDependencies?.[name]) {
      results.push({
        name,
        version: cleanVersion(pkg.devDependencies[name]),
        isDev: true,
      });
    }
  }

  return results;
}

/** npm レジストリから最新バージョンを取得 */
async function fetchLatestVersion(
  packageName: string,
): Promise<string | null> {
  try {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data: NpmRegistryResponse = await res.json();
    return data["dist-tags"]?.latest ?? null;
  } catch {
    return null;
  }
}

/** GitHub Advisory API から npm パッケージの脆弱性を取得 */
async function fetchVulnerabilities(
  packageName: string,
): Promise<GitHubAdvisory[]> {
  try {
    const url = `https://api.github.com/advisories?ecosystem=npm&package=${encodeURIComponent(packageName)}&per_page=5`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** 脆弱性がcurrentVersionに該当するかチェック（簡易判定） */
function isVersionAffected(
  currentVersion: string,
  vulnRange: string,
): boolean {
  // "< 15.1.0" 形式のシンプルチェック
  const ltMatch = vulnRange.match(/^<\s*(\d+\.\d+\.\d+)/);
  if (ltMatch) {
    return checkOutdated(currentVersion, ltMatch[1]);
  }
  // "<= X.Y.Z" 形式
  const lteMatch = vulnRange.match(/^<=\s*(\d+\.\d+\.\d+)/);
  if (lteMatch) {
    return (
      checkOutdated(currentVersion, lteMatch[1]) ||
      currentVersion === lteMatch[1]
    );
  }
  // ">= A, < B" 形式
  const rangeMatch = vulnRange.match(
    />=\s*(\d+\.\d+\.\d+)\s*,\s*<\s*(\d+\.\d+\.\d+)/,
  );
  if (rangeMatch) {
    return (
      !checkOutdated(currentVersion, rangeMatch[1]) &&
      checkOutdated(currentVersion, rangeMatch[2])
    );
  }
  // 判定不能 → 安全側に倒す（該当なし）
  return false;
}

interface RunCheckOptions {
  trigger: "scheduled" | "manual";
  triggeredBy?: string;
}

/** 依存関係チェックを実行 */
export async function runDependencyCheck(options: RunCheckOptions) {
  const startTime = Date.now();

  // レポートを作成（running状態）
  const report = await prisma.dependencyReport.create({
    data: {
      trigger: options.trigger,
      triggeredBy: options.triggeredBy,
      status: "running",
    },
  });

  try {
    const packages = await readCurrentVersions();

    // npm レジストリと GitHub Advisory を並行で問い合わせ
    const results = await Promise.all(
      packages.map(async (pkg) => {
        const [latestVersion, advisories] = await Promise.all([
          fetchLatestVersion(pkg.name),
          fetchVulnerabilities(pkg.name),
        ]);

        // 該当する脆弱性をフィルタ
        const matchingAdvisory = advisories.find((adv) =>
          adv.vulnerabilities.some(
            (v) =>
              v.package.name === pkg.name &&
              isVersionAffected(pkg.version, v.vulnerable_version_range),
          ),
        );

        const outdated =
          latestVersion != null && checkOutdated(pkg.version, latestVersion);

        return {
          reportId: report.id,
          packageName: pkg.name,
          currentVersion: pkg.version,
          latestVersion,
          isOutdated: outdated,
          isDev: pkg.isDev,
          hasVulnerability: !!matchingAdvisory,
          vulnSeverity: matchingAdvisory?.severity?.toLowerCase() ?? null,
          vulnTitle: matchingAdvisory?.summary ?? null,
          vulnAdvisoryUrl: matchingAdvisory?.html_url ?? null,
        };
      }),
    );

    // DB に結果を一括保存
    await prisma.dependencyItem.createMany({ data: results });

    // サマリ計算
    const summary = {
      total: results.length,
      outdated: results.filter((r) => r.isOutdated).length,
      vulnerable: results.filter((r) => r.hasVulnerability).length,
      critical: results.filter((r) => r.vulnSeverity === "critical").length,
      high: results.filter((r) => r.vulnSeverity === "high").length,
      medium: results.filter((r) => r.vulnSeverity === "medium").length,
      low: results.filter((r) => r.vulnSeverity === "low").length,
    };

    const durationMs = Date.now() - startTime;

    // レポートを完了状態に更新
    await prisma.dependencyReport.update({
      where: { id: report.id },
      data: { status: "completed", summary, durationMs },
    });

    // 監査ログ
    await AuditService.log({
      action: "DEPENDENCY_CHECK",
      category: "SYSTEM_SETTING",
      userId: options.triggeredBy,
      details: {
        trigger: options.trigger,
        reportId: report.id,
        ...summary,
        durationMs,
      },
    });

    // 脆弱性があればADMIN全員に通知
    if (summary.vulnerable > 0) {
      const vulnItems = results.filter((r) => r.hasVulnerability);
      const pkgList = vulnItems
        .map((v) => `${v.packageName} (${v.vulnSeverity})`)
        .join(", ");

      await NotificationService.broadcast({
        role: "ADMIN",
        type: "SECURITY",
        priority: summary.critical > 0 ? "URGENT" : "HIGH",
        title: `Dependency vulnerability detected: ${summary.vulnerable} package(s)`,
        titleJa: `依存パッケージの脆弱性を検出: ${summary.vulnerable}件`,
        message: `Affected packages: ${pkgList}. Check the System tab for details.`,
        messageJa: `対象パッケージ: ${pkgList}。システムタブで詳細を確認してください。`,
        actionUrl: "/admin?tab=system",
        actionLabel: "View Details",
        actionLabelJa: "詳細を確認",
        source: "dependency-check",
        sourceId: report.id,
      });
    }

    return report.id;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.dependencyReport.update({
      where: { id: report.id },
      data: { status: "failed", errorMessage, durationMs },
    });

    await AuditService.log({
      action: "DEPENDENCY_CHECK",
      category: "SYSTEM_SETTING",
      userId: options.triggeredBy,
      details: { trigger: options.trigger, error: errorMessage, durationMs },
    });

    throw error;
  }
}

/** 最新レポートを取得 */
export async function getLatestReport() {
  return prisma.dependencyReport.findFirst({
    where: { status: { in: ["completed", "failed"] } },
    orderBy: { checkedAt: "desc" },
    include: { items: true },
  });
}

/** 特定レポートを取得 */
export async function getReportById(id: string) {
  return prisma.dependencyReport.findUnique({
    where: { id },
    include: { items: true },
  });
}
