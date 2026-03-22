import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { EditorService } from "@/lib/addon-modules/editor/editor-service";

export const GET = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const id = new URL(request.url).pathname.split("/api/editor/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Document ID is required");

  const doc = await EditorService.getDocument(id);
  if (!doc) throw ApiError.notFound("Document not found");
  if (doc.createdBy !== userId) throw ApiError.forbidden("Access denied");

  return { document: doc };
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
  const doc = await EditorService.updateDocument(id, body);
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
