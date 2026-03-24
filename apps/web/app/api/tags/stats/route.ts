import { apiHandler } from "@/lib/api/api-handler";
import { TagService } from "@/lib/services/tag-service";

// GET /api/tags/stats - タグ使用統計（ADMIN）
export const GET = apiHandler(async () => {
  const stats = await TagService.getTagUsageStats();
  return { stats };
}, { admin: true });
