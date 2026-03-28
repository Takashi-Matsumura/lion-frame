import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { checkAccess } from "@/lib/auth/access-checker";
import { ensureSessionInMemory } from "@/lib/addon-modules/handson/handson-service";
import { getProgressMatrix } from "@/lib/addon-modules/handson/handson-store";

const HANDSON_ROLES = ["MANAGER", "EXECUTIVE", "ADMIN"];

// GET /api/handson/sessions/[id]/progress — 進捗マトリクス（講師権限）
export const GET = apiHandler(async (request, session) => {
  const hasAccess = await checkAccess(session, "/handson", HANDSON_ROLES);
  if (!hasAccess) throw ApiError.forbidden("Access denied");

  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const sessionId = segments[segments.indexOf("sessions") + 1];

  const ok = await ensureSessionInMemory(sessionId);
  if (!ok) throw ApiError.notFound("Session not found or ended");

  const matrix = getProgressMatrix(sessionId);
  return matrix;
});
