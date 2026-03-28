import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";

// GET /api/handson/sessions/[id]/document — セッション紐付きドキュメント取得（全ロール、GUEST用プロキシ）
export const GET = apiHandler(async (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];

  // セッション取得
  const session = await prisma.handsonSession.findUnique({
    where: { id: sessionId },
    select: { documentId: true, endedAt: true },
  });

  if (!session) throw ApiError.notFound("Session not found");

  // ドキュメント取得
  const doc = await prisma.editorDocument.findUnique({
    where: { id: session.documentId },
    select: { id: true, title: true, content: true },
  });

  if (!doc) throw ApiError.notFound("Document not found");

  return { document: doc };
});
