import { apiHandler } from "@/lib/api";
import {
  type AuditAction,
  type AuditCategory,
  AuditService,
} from "@/lib/services/audit-service";

/**
 * GET /api/admin/audit-logs
 * 監査ログを取得（管理者のみ）
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as AuditCategory | null;
  const action = searchParams.get("action") as AuditAction | null;
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const result = await AuditService.getLogs({
    category: category || undefined,
    action: action || undefined,
    userId: userId || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit: Math.min(limit, 100), // 最大100件
    offset,
  });

  return result;
}, { admin: true });
