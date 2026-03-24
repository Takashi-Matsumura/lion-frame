import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { EditorService } from "@/lib/addon-modules/editor/editor-service";
import { TagService } from "@/lib/services/tag-service";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const tagId = url.searchParams.get("tagId") ?? undefined;
  const scope = url.searchParams.get("scope") ?? "mine"; // mine | shared | all

  // ユーザの部署IDを取得（公開ドキュメントのフィルタ用）
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const employee = user?.email
    ? await prisma.employee.findFirst({
        where: { email: user.email, isActive: true },
        select: { departmentId: true },
      })
    : null;
  const departmentId = employee?.departmentId ?? undefined;

  let myDocs = scope !== "shared"
    ? await EditorService.listDocuments(userId, type)
    : [];

  let sharedDocs = scope !== "mine"
    ? await EditorService.listPublishedDocuments(userId, undefined, departmentId)
    : [];

  // タグフィルタ
  if (tagId) {
    const entityIds = await TagService.getEntitiesByTagIds([tagId], "EditorDocument");
    const entityIdSet = new Set(entityIds);
    myDocs = myDocs.filter((doc) => entityIdSet.has(doc.id));
    sharedDocs = sharedDocs.filter((doc) => entityIdSet.has(doc.id));
  }

  // 統合（重複排除）
  const allDocs = scope === "mine" ? myDocs
    : scope === "shared" ? sharedDocs
    : [...myDocs, ...sharedDocs.filter((sd) => !myDocs.some((md) => md.id === sd.id))];

  // 各ドキュメントのタグ情報を付与
  const documentsWithTags = await Promise.all(
    allDocs.map(async (doc) => ({
      ...doc,
      tags: await TagService.getTagsForEntity("EditorDocument", doc.id),
      isOwner: doc.createdBy === userId,
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
