import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { TagService } from "@/lib/services/tag-service";

// GET /api/tags - 全システムタグ一覧
export const GET = apiHandler(async () => {
  const tags = await TagService.listTags();
  return { tags };
}, {});

// POST /api/tags - システムタグ作成（ADMIN）
export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const body = await request.json();
  const { name, nameJa, color, description } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    throw ApiError.badRequest("Tag name is required", "タグ名は必須です");
  }

  const tag = await TagService.createTag({
    name,
    nameJa,
    color,
    description,
    createdBy: userId,
  });

  return { tag };
}, { admin: true, successStatus: 201 });
