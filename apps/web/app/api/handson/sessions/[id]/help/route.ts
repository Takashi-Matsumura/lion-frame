import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
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

// GET /api/handson/sessions/[id]/help — ヘルプリクエスト一覧（MANAGER+）
export const GET = apiHandler(
  async (request) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const sessionId = segments[segments.indexOf("sessions") + 1];

    await ensureSessionInMemory(sessionId);
    const requests = getActiveHelpRequests(sessionId);
    return { requests };
  },
  { requiredRole: "MANAGER" },
);

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

  // 参加者情報取得
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

  // DB書込み
  const log = await writeLog({
    sessionId,
    participantId,
    type: "HELP_REQUEST",
    sectionIndex: sectionIndex ?? 0,
    metadata: message ? { message } : undefined,
  });

  // インメモリ登録
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

// DELETE /api/handson/sessions/[id]/help — ヘルプ解決（MANAGER+）
export const DELETE = apiHandler(
  async (request) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const sessionId = segments[segments.indexOf("sessions") + 1];
    const logId = url.searchParams.get("logId");

    if (!logId) throw ApiError.badRequest("logId is required");

    await ensureSessionInMemory(sessionId);
    const resolved = resolveHelpRequest(sessionId, logId);

    if (resolved) {
      // 解決ログを非同期で書込み
      // participantIdは解決者ではなく元のヘルプリクエストのものを使う
      // ここでは簡易的にlogIdをメタデータに記録
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
  },
  { requiredRole: "MANAGER" },
);
