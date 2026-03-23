import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { EditorService } from "@/lib/addon-modules/editor/editor-service";

export const GET = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const documents = await EditorService.listDocuments(userId, type);
  return { documents };
}, {});

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const body = await request.json();
  const doc = await EditorService.createDocument(userId, body);
  return { document: doc };
}, { successStatus: 201 });
