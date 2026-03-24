import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { TagService } from "@/lib/services/tag-service";

// PUT /api/tags/[id] - システムタグ更新（ADMIN）
export const PUT = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) throw ApiError.badRequest("Tag ID is required");

  const body = await request.json();
  const { name, nameJa, color, description } = body;

  const tag = await TagService.updateTag(id, { name, nameJa, color, description }, userId);
  return { tag };
}, { admin: true });

// DELETE /api/tags/[id] - システムタグ削除（ADMIN）
export const DELETE = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) throw ApiError.badRequest("Tag ID is required");

  await TagService.deleteTag(id, userId);
  return { success: true };
}, { admin: true });
