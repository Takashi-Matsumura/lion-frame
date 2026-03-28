import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { checkAccess } from "@/lib/auth/access-checker";
import { getSessionAnalytics } from "@/lib/addon-modules/handson/handson-service";
import { prisma } from "@/lib/prisma";

const HANDSON_ROLES = ["MANAGER", "EXECUTIVE", "ADMIN"];

// GET /api/handson/sessions/[id]/analytics — セッション分析（講師権限、終了済みのみ）
export const GET = apiHandler(async (request, session) => {
  const hasAccess = await checkAccess(session, "/handson", HANDSON_ROLES);
  if (!hasAccess) throw ApiError.forbidden("Access denied");

  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];

  const handsonSession = await prisma.handsonSession.findUnique({
    where: { id: sessionId },
    select: { id: true, endedAt: true },
  });
  if (!handsonSession) throw ApiError.notFound("Session not found");
  if (!handsonSession.endedAt) throw ApiError.badRequest("Session has not ended yet");

  const analytics = await getSessionAnalytics(sessionId);
  return analytics;
});
