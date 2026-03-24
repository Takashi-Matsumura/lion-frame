import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { EditorService } from "@/lib/addon-modules/editor/editor-service";
import { prisma } from "@/lib/prisma";

/** ユーザIDからメール経由でEmployee部署IDを取得 */
async function getDepartmentId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return null;
  const emp = await prisma.employee.findFirst({
    where: { email: user.email, isActive: true },
    select: { departmentId: true },
  });
  return emp?.departmentId ?? null;
}

/** ドキュメントへのアクセス権を確認（閲覧） */
async function checkReadAccess(doc: { createdBy: string; status: string; visibility: string }, userId: string) {
  // 作成者本人
  if (doc.createdBy === userId) return;

  // 公開中のみ他ユーザにアクセス許可
  if (doc.status !== "PUBLISHED") {
    throw ApiError.forbidden("Access denied");
  }

  // 全社公開
  if (doc.visibility === "ORGANIZATION") return;

  // 部署内公開: 同部署か確認
  if (doc.visibility === "DEPARTMENT") {
    const creatorDeptId = await getDepartmentId(doc.createdBy);
    const viewerDeptId = await getDepartmentId(userId);
    if (creatorDeptId && viewerDeptId && creatorDeptId === viewerDeptId) {
      return;
    }
  }

  throw ApiError.forbidden("Access denied");
}

export const GET = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const id = new URL(request.url).pathname.split("/api/editor/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Document ID is required");

  const doc = await EditorService.getDocument(id);
  if (!doc) throw ApiError.notFound("Document not found");

  await checkReadAccess(doc, userId);

  return { document: doc, isOwner: doc.createdBy === userId };
}, {});

export const PUT = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const id = new URL(request.url).pathname.split("/api/editor/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Document ID is required");

  const existing = await EditorService.getDocument(id);
  if (!existing) throw ApiError.notFound("Document not found");
  if (existing.createdBy !== userId) throw ApiError.forbidden("Access denied");

  const body = await request.json();
  const doc = await EditorService.updateDocument(id, body, userId);
  return { document: doc };
}, {});

export const DELETE = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const id = new URL(request.url).pathname.split("/api/editor/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Document ID is required");

  const existing = await EditorService.getDocument(id);
  if (!existing) throw ApiError.notFound("Document not found");
  if (existing.createdBy !== userId) throw ApiError.forbidden("Access denied");

  await EditorService.deleteDocument(id);
  return { success: true };
}, {});
