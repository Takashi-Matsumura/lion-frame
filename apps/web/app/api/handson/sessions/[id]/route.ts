import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import {
  getSession,
  endSession,
  deleteSession,
  activateSession,
} from "@/lib/addon-modules/handson/handson-service";

// GET /api/handson/sessions/[id] — セッション詳細（MANAGER+）
export const GET = apiHandler(
  async (request) => {
    const id = new URL(request.url).pathname.split("/").pop()!;
    const session = await getSession(id);
    if (!session) throw ApiError.notFound("Session not found");
    return { session };
  },
  { requiredRole: "MANAGER" },
);

// PATCH /api/handson/sessions/[id] — セッション更新/終了（MANAGER+）
export const PATCH = apiHandler(
  async (request) => {
    const id = new URL(request.url).pathname.split("/").pop()!;
    const body = await request.json();

    if (body.action === "end") {
      const session = await endSession(id);
      return { session };
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
  },
  { requiredRole: "MANAGER" },
);

// DELETE /api/handson/sessions/[id] — セッション削除（MANAGER+）
export const DELETE = apiHandler(
  async (request) => {
    const id = new URL(request.url).pathname.split("/").pop()!;
    try {
      await deleteSession(id);
      return { success: true };
    } catch (e) {
      throw ApiError.badRequest(
        e instanceof Error ? e.message : "Delete failed",
      );
    }
  },
  { requiredRole: "MANAGER" },
);
