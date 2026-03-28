import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import {
  joinSession,
  leaveSession,
  ensureSessionInMemory,
} from "@/lib/addon-modules/handson/handson-service";
import { isSeatTaken } from "@/lib/addon-modules/handson/handson-store";

// POST /api/handson/sessions/[id]/join — セッション参加（全ロール）
export const POST = apiHandler(async (request, session) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];

  const body = await request.json();
  const { seatNumber, displayName } = body;

  if (!displayName || typeof seatNumber !== "number") {
    throw ApiError.badRequest("displayName and seatNumber are required");
  }

  // セッション存在確認
  const handsonSession = await prisma.handsonSession.findUnique({
    where: { id: sessionId },
    select: { id: true, maxSeats: true, endedAt: true },
  });

  if (!handsonSession) throw ApiError.notFound("Session not found");
  if (handsonSession.endedAt) throw ApiError.badRequest("Session has ended");

  if (seatNumber < 1 || seatNumber > handsonSession.maxSeats) {
    throw ApiError.badRequest(
      `Seat number must be between 1 and ${handsonSession.maxSeats}`,
    );
  }

  // インメモリ復旧
  await ensureSessionInMemory(sessionId);

  // 座席の重複チェック
  if (isSeatTaken(sessionId, seatNumber)) {
    throw ApiError.badRequest("This seat is already taken");
  }

  const participant = await joinSession({
    sessionId,
    userId: session.user?.id,
    displayName,
    seatNumber,
  });

  return { participantId: participant.id, seatNumber };
});

// DELETE /api/handson/sessions/[id]/join — セッション退出（全ロール）
export const DELETE = apiHandler(async (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];
  const participantId = url.searchParams.get("participantId");

  if (!participantId) {
    throw ApiError.badRequest("participantId is required");
  }

  await ensureSessionInMemory(sessionId);
  await leaveSession(sessionId, participantId);

  return { success: true };
});
