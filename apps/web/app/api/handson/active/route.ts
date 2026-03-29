import { apiHandler } from "@/lib/api/api-handler";
import { getActiveSession, getRehearsalSession, getRehearsalSessionId } from "@/lib/addon-modules/handson/handson-service";

function formatSession(s: { id: string; title: string; documentId: string; maxSeats: number; startedAt: Date; _count: { participants: number } }) {
  return {
    id: s.id,
    title: s.title,
    documentId: s.documentId,
    maxSeats: s.maxSeats,
    participantCount: s._count.participants,
    startedAt: s.startedAt,
  };
}

// GET /api/handson/active — アクティブ/リハーサルセッション情報取得（全ロール）
export const GET = apiHandler(async () => {
  const [activeSession, rehearsalSession] = await Promise.all([
    getActiveSession(),
    getRehearsalSession(),
  ]);

  // 受講可能なセッション一覧（アクティブ + リハーサル）
  const availableSessions: Array<ReturnType<typeof formatSession> & { mode: "active" | "rehearsal" }> = [];
  if (activeSession) {
    availableSessions.push({ ...formatSession(activeSession), mode: "active" });
  }
  if (rehearsalSession) {
    availableSessions.push({ ...formatSession(rehearsalSession), mode: "rehearsal" });
  }

  return {
    active: !!activeSession,
    session: activeSession ? formatSession(activeSession) : null,
    rehearsalSessionId: rehearsalSession?.id ?? null,
    availableSessions,
  };
});
