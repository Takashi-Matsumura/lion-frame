import { apiHandler } from "@/lib/api";
import { readCurrentVersions } from "@/lib/core-modules/system/services/dependency-check-service";

/**
 * GET /api/admin/system-versions
 * package.json から主要パッケージの現在バージョンを返す
 */
export const GET = apiHandler(async () => {
  const packages = await readCurrentVersions();

  // フレームワーク情報として構造化
  const versionMap: Record<string, string> = {};
  for (const pkg of packages) {
    versionMap[pkg.name] = pkg.version;
  }

  return {
    versions: versionMap,
    framework: `Next.js ${versionMap.next ?? "unknown"}`,
    database: `PostgreSQL (Prisma ${versionMap["@prisma/client"] ?? versionMap.prisma ?? "unknown"})`,
    auth: `Auth.js (NextAuth ${versionMap["next-auth"] ?? "unknown"})`,
    styling: `Tailwind CSS ${versionMap.tailwindcss ?? "unknown"}`,
    language: `TypeScript ${versionMap.typescript ?? "unknown"}`,
    runtime: `React ${versionMap.react ?? "unknown"}`,
  };
}, { admin: true });
