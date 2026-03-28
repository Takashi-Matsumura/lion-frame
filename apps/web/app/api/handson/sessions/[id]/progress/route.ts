import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { ensureSessionInMemory } from "@/lib/addon-modules/handson/handson-service";
import { getProgressMatrix } from "@/lib/addon-modules/handson/handson-store";

// GET /api/handson/sessions/[id]/progress — 進捗マトリクス（MANAGER+）
export const GET = apiHandler(
  async (request) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const sessionId = segments[segments.indexOf("sessions") + 1];

    const ok = await ensureSessionInMemory(sessionId);
    if (!ok) throw ApiError.notFound("Session not found or ended");

    const matrix = getProgressMatrix(sessionId);
    return matrix;
  },
  { requiredRole: "MANAGER" },
);
