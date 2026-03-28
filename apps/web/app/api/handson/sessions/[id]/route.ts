import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { checkAccess } from "@/lib/auth/access-checker";
import {
  getSession,
  endSession,
  deleteSession,
  activateSession,
} from "@/lib/addon-modules/handson/handson-service";

const HANDSON_ROLES = ["MANAGER", "EXECUTIVE", "ADMIN"];

// GET /api/handson/sessions/[id] — セッション詳細（講師権限）
export const GET = apiHandler(async (request, session) => {
  const hasAccess = await checkAccess(session, "/handson", HANDSON_ROLES);
  if (!hasAccess) throw ApiError.forbidden("Access denied");

  const id = new URL(request.url).pathname.split("/").pop()!;
  const handsonSession = await getSession(id);
  if (!handsonSession) throw ApiError.notFound("Session not found");
  return { session: handsonSession };
});

// PATCH /api/handson/sessions/[id] — セッション更新/終了/開始（講師権限）
export const PATCH = apiHandler(async (request, session) => {
  const hasAccess = await checkAccess(session, "/handson", HANDSON_ROLES);
  if (!hasAccess) throw ApiError.forbidden("Access denied");

  const id = new URL(request.url).pathname.split("/").pop()!;
  const body = await request.json();

  if (body.action === "end") {
    const handsonSession = await endSession(id);
    return { session: handsonSession };
  }

  if (body.action === "activate") {
    try {
      await activateSession(id);
      return { success: true };
    } catch (e) {
      throw ApiError.badRequest(
        e instanceof Error ? e.message : "Activate failed",
      );
    }
  }

  throw ApiError.badRequest("Unknown action");
});

// DELETE /api/handson/sessions/[id] — セッション削除（講師権限）
export const DELETE = apiHandler(async (request, session) => {
  const hasAccess = await checkAccess(session, "/handson", HANDSON_ROLES);
  if (!hasAccess) throw ApiError.forbidden("Access denied");

  const id = new URL(request.url).pathname.split("/").pop()!;
  try {
    await deleteSession(id);
    return { success: true };
  } catch (e) {
    throw ApiError.badRequest(
      e instanceof Error ? e.message : "Delete failed",
    );
  }
});
