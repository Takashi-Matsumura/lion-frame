import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { TagService } from "@/lib/services/tag-service";

// GET /api/tags/assignments - エンティティのタグ取得
export const GET = apiHandler(async (request) => {
  const url = new URL(request.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");

  if (!entityType || !entityId) {
    throw ApiError.badRequest("entityType and entityId are required");
  }

  const tags = await TagService.getTagsForEntity(entityType, entityId);
  return { tags };
}, {});

// POST /api/tags/assignments - タグ割り当て（一括設定）
export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const body = await request.json();
  const { entityType, entityId, systemTagIds, userTags } = body;

  if (!entityType || !entityId) {
    throw ApiError.badRequest("entityType and entityId are required");
  }

  const tags = await TagService.setTagsForEntity(
    systemTagIds ?? [],
    userTags ?? [],
    entityType,
    entityId,
    userId,
  );

  return { tags };
}, {});

// DELETE /api/tags/assignments - タグ解除
export const DELETE = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const url = new URL(request.url);
  const assignmentId = url.searchParams.get("id");

  if (!assignmentId) {
    throw ApiError.badRequest("Assignment ID is required");
  }

  await TagService.unassignTag(assignmentId, userId);
  return { success: true };
}, {});
