import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";

// GET /api/handson/sessions/[id]/my-status?participantId=xxx — 自分の回答状態取得（全ロール）
export const GET = apiHandler(async (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];
  const participantId = url.searchParams.get("participantId");

  if (!participantId) {
    throw ApiError.badRequest("participantId is required");
  }

  // 該当participantのログからCOMMAND_OK/COMMAND_ERRORを取得
  const logs = await prisma.handsonLog.findMany({
    where: {
      sessionId,
      participantId,
      type: { in: ["COMMAND_OK", "COMMAND_ERROR"] },
    },
    orderBy: { createdAt: "asc" },
    select: { type: true, commandIndex: true },
  });

  // commandIndex → 最新ステータスのマップを構築
  const statuses: Record<number, "ok" | "error"> = {};
  for (const log of logs) {
    if (log.commandIndex != null) {
      statuses[log.commandIndex] = log.type === "COMMAND_OK" ? "ok" : "error";
    }
  }

  return { statuses };
});
