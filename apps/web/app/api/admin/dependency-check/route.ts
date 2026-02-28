import { apiHandler } from "@/lib/api";
import {
  getLatestReport,
  runDependencyCheck,
} from "@/lib/core-modules/system/services/dependency-check-service";

/**
 * GET /api/admin/dependency-check
 * 最新のチェックレポートを取得
 */
export const GET = apiHandler(async () => {
  const report = await getLatestReport();
  return { report };
}, { admin: true });

/**
 * POST /api/admin/dependency-check
 * 手動でチェックを実行
 */
export const POST = apiHandler(async (_request, session) => {
  const reportId = await runDependencyCheck({
    trigger: "manual",
    triggeredBy: session.user.id,
  });
  return { reportId, message: "Dependency check started" };
}, { admin: true });
