import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { EditorService } from "@/lib/addon-modules/editor/editor-service";
import { TagService } from "@/lib/services/tag-service";

export const GET = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const tagId = url.searchParams.get("tagId") ?? undefined;

  let documents = await EditorService.listDocuments(userId, type);

  // タグフィルタ
  if (tagId) {
    const entityIds = await TagService.getEntitiesByTagIds([tagId], "EditorDocument");
    const entityIdSet = new Set(entityIds);
    documents = documents.filter((doc) => entityIdSet.has(doc.id));
  }

  // 各ドキュメントのタグ情報を付与
  const documentsWithTags = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      tags: await TagService.getTagsForEntity("EditorDocument", doc.id),
    })),
  );

  return { documents: documentsWithTags };
}, {});

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const body = await request.json();
  const doc = await EditorService.createDocument(userId, body);
  return { document: doc };
}, { successStatus: 201 });
