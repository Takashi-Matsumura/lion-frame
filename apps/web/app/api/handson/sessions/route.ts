import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import {
  createSession,
  listSessions,
} from "@/lib/addon-modules/handson/handson-service";
import { prisma } from "@/lib/prisma";

// GET /api/handson/sessions — セッション一覧（MANAGER+）
export const GET = apiHandler(
  async () => {
    const sessions = await listSessions();
    return { sessions };
  },
  { requiredRole: "MANAGER" },
);

// POST /api/handson/sessions — セッション作成（MANAGER+）
export const POST = apiHandler(
  async (request, session) => {
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
  { requiredRole: "MANAGER", successStatus: 201 },
);
