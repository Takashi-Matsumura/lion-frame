import { apiHandler } from "@/lib/api/api-handler";
import { getActiveSession } from "@/lib/addon-modules/handson/handson-service";

// GET /api/handson/active — アクティブセッション情報取得（全ロール）
export const GET = apiHandler(async () => {
  const session = await getActiveSession();
  if (!session) {
    return { active: false, session: null };
  }
  return {
    active: true,
    session: {
      id: session.id,
      title: session.title,
      documentId: session.documentId,
      maxSeats: session.maxSeats,
      participantCount: session._count.participants,
      startedAt: session.startedAt,
    },
  };
});
