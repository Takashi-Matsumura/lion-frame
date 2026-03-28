import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { checkAccess } from "@/lib/auth/access-checker";
import {
  writeLog,
  ensureSessionInMemory,
} from "@/lib/addon-modules/handson/handson-service";
import {
  addHelpRequest,
  resolveHelpRequest,
  getActiveHelpRequests,
  getParticipants,
} from "@/lib/addon-modules/handson/handson-store";

const HANDSON_ROLES = ["MANAGER", "EXECUTIVE", "ADMIN"];

// GET /api/handson/sessions/[id]/help — ヘルプリクエスト一覧（講師権限）
export const GET = apiHandler(async (request, session) => {
  const hasAccess = await checkAccess(session, "/handson", HANDSON_ROLES);
  if (!hasAccess) throw ApiError.forbidden("Access denied");

  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];

  await ensureSessionInMemory(sessionId);
  const requests = getActiveHelpRequests(sessionId);
  return { requests };
});

// POST /api/handson/sessions/[id]/help — ヘルプ送信（全ロール）
export const POST = apiHandler(async (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];

  const body = await request.json();
  const { participantId, sectionIndex, message } = body;

  if (!participantId) {
    throw ApiError.badRequest("participantId is required");
  }

  await ensureSessionInMemory(sessionId);

  const participants = getParticipants(sessionId);
  let seatNumber = 0;
  let displayName = "";
  for (const [, p] of participants) {
    if (p.id === participantId) {
      seatNumber = p.seatNumber;
      displayName = p.displayName;
      break;
    }
  }

  const log = await writeLog({
    sessionId,
    participantId,
    type: "HELP_REQUEST",
    sectionIndex: sectionIndex ?? 0,
    metadata: message ? { message } : undefined,
  });

  addHelpRequest(sessionId, {
    logId: log.id,
    participantId,
    seatNumber,
    displayName,
    sectionIndex: sectionIndex ?? 0,
    message,
    createdAt: new Date(),
  });

  return { helpLogId: log.id };
});

// DELETE /api/handson/sessions/[id]/help — ヘルプ解決（講師権限）
export const DELETE = apiHandler(async (request, session) => {
  const hasAccess = await checkAccess(session, "/handson", HANDSON_ROLES);
  if (!hasAccess) throw ApiError.forbidden("Access denied");

  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];
  const logId = url.searchParams.get("logId");

  if (!logId) throw ApiError.badRequest("logId is required");

  await ensureSessionInMemory(sessionId);
  const resolved = resolveHelpRequest(sessionId, logId);

  if (resolved) {
    writeLog({
      sessionId,
      participantId: "system",
      type: "HELP_RESOLVED",
      metadata: { helpLogId: logId },
    }).catch((err) => {
      console.error("[HandsonLog] Failed to write HELP_RESOLVED:", err);
    });
  }

  return { resolved };
});
