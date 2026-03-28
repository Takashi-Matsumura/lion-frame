import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import {
  writeLog,
  ensureSessionInMemory,
} from "@/lib/addon-modules/handson/handson-service";
import {
  setCommandStatus,
  setCheckpoint,
  setInstructorCheckpoint,
} from "@/lib/addon-modules/handson/handson-store";

// POST /api/handson/sessions/[id]/log — ログ記録（全ロール）
export const POST = apiHandler(async (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];

  const body = await request.json();
  const { participantId, type, sectionIndex, stepId, commandIndex, status, metadata } = body;

  if (!participantId || !type) {
    throw ApiError.badRequest("participantId and type are required");
  }

  // インメモリ復旧
  await ensureSessionInMemory(sessionId);

  // インメモリ即座更新
  switch (type) {
    case "COMMAND_OK":
      if (commandIndex != null) {
        setCommandStatus(sessionId, participantId, commandIndex, "OK");
      }
      break;
    case "COMMAND_ERROR":
      if (commandIndex != null) {
        setCommandStatus(sessionId, participantId, commandIndex, "ERROR");
      }
      break;
    case "CHECKPOINT_COMPLETE":
      if (sectionIndex != null) {
        setCheckpoint(sessionId, participantId, sectionIndex);
      }
      break;
    case "INSTRUCTOR_CHECKPOINT":
      if (commandIndex != null) {
        setInstructorCheckpoint(sessionId, commandIndex);
      }
      break;
  }

  // 非同期DB書込み（レスポンスを待たずに返す）
  const logPromise = writeLog({
    sessionId,
    participantId,
    type,
    sectionIndex,
    stepId,
    commandIndex,
    status,
    metadata,
  });

  // DB書込みエラーはログに記録するが、クライアントには影響させない
  logPromise.catch((err) => {
    console.error("[HandsonLog] Failed to write log:", err);
  });

  return { success: true };
});
