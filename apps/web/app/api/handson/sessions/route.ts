import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import {
  createSession,
  listSessions,
  getRehearsalSessionId,
} from "@/lib/addon-modules/handson/handson-service";
import { checkAccess } from "@/lib/auth/access-checker";
import { prisma } from "@/lib/prisma";

const HANDSON_ROLES = ["MANAGER", "EXECUTIVE", "ADMIN"];

// GET /api/handson/sessions — セッション一覧（講師権限）
export const GET = apiHandler(async (_request, session) => {
  const hasAccess = await checkAccess(session, "/handson", HANDSON_ROLES);
  if (!hasAccess) throw ApiError.forbidden("Access denied");

  const [sessions, rehearsalSessionId] = await Promise.all([
    listSessions(),
    getRehearsalSessionId(),
  ]);
  return { sessions, rehearsalSessionId };
});

// POST /api/handson/sessions — セッション作成（講師権限）
export const POST = apiHandler(
  async (request, session) => {
    const hasAccess = await checkAccess(session, "/handson", HANDSON_ROLES);
    if (!hasAccess) throw ApiError.forbidden("Access denied");

    const body = await request.json();
    const { title, date, documentId, maxSeats } = body;

    if (!title || !date || !documentId) {
      throw ApiError.badRequest("title, date, and documentId are required");
    }

    // ドキュメントの存在確認
    const doc = await prisma.editorDocument.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, status: true },
    });
    if (!doc) {
      throw ApiError.notFound("Document not found");
    }
    if (doc.status !== "PUBLISHED") {
      throw ApiError.badRequest("Document must be published");
    }

    const handsonSession = await createSession({
      title,
      date,
      documentId,
      maxSeats: maxSeats ?? 15,
      createdBy: session.user!.id,
    });

    return { session: handsonSession };
  },
  { successStatus: 201 },
);
