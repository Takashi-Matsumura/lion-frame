import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/api/api-error";
import { getReportById } from "@/lib/core-modules/system/services/dependency-check-service";

/**
 * GET /api/admin/dependency-check/[id]
 * 特定レポートの詳細を取得
 */
export const GET = apiHandler(async (request) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    throw ApiError.badRequest("Report ID is required");
  }

  const report = await getReportById(id);
  if (!report) {
    throw ApiError.notFound("Report not found", "レポートが見つかりません");
  }

  return { report };
}, { admin: true });
