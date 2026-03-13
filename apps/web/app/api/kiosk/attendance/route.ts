import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { getAttendanceList } from "@/lib/kiosk-modules/event-attendance/event-attendance-service";
import type { Role } from "@prisma/client";

/**
 * GET /api/kiosk/attendance?sessionId=xxx — 出席者一覧（管理者用）
 */
export const GET = apiHandler(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      throw ApiError.badRequest(
        "sessionId is required",
        "セッションIDは必須です",
      );
    }

    const attendances = await getAttendanceList(sessionId);
    return { attendances };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);
