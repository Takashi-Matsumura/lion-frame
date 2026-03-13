import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import {
  createSession,
  deactivateSession,
  listSessions,
} from "@/lib/kiosk/kiosk-session-service";
import type { Role } from "@prisma/client";

/**
 * GET /api/kiosk/sessions — セッション一覧
 */
export const GET = apiHandler(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("moduleId") || undefined;
    const sessions = await listSessions(moduleId);
    return { sessions };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);

/**
 * POST /api/kiosk/sessions — セッション作成
 */
export const POST = apiHandler(
  async (request, session) => {
    const body = await request.json();
    const { name, moduleId, referenceId, expiresAt, config } = body;

    if (!name || !moduleId || !expiresAt) {
      throw ApiError.badRequest(
        "name, moduleId, and expiresAt are required",
        "名前、モジュールID、有効期限は必須です",
      );
    }

    const expiresDate = new Date(expiresAt);
    if (expiresDate <= new Date()) {
      throw ApiError.badRequest(
        "expiresAt must be in the future",
        "有効期限は未来の日時を指定してください",
      );
    }

    const kioskSession = await createSession({
      name,
      moduleId,
      referenceId,
      createdBy: session.user.id,
      expiresAt: expiresDate,
      config,
    });

    return { session: kioskSession };
  },
  { requiredRoles: ["ADMIN"] as Role[], successStatus: 201 },
);

/**
 * PATCH /api/kiosk/sessions — セッション無効化
 */
export const PATCH = apiHandler(
  async (request) => {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      throw ApiError.badRequest("id is required", "IDは必須です");
    }

    const kioskSession = await deactivateSession(id);
    return { session: kioskSession };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);
