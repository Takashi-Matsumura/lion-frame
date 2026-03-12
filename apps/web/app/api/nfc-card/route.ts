import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import {
  listCards,
  registerCard,
} from "@/lib/addon-modules/nfc-card/nfc-card-service";
import type { Role } from "@prisma/client";

/**
 * GET /api/nfc-card — NFCカード一覧
 */
export const GET = apiHandler(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const cards = await listCards({ activeOnly });
    return { cards };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);

/**
 * POST /api/nfc-card — NFCカード登録
 */
export const POST = apiHandler(
  async (request) => {
    const body = await request.json();
    const { cardId, employeeId } = body;

    if (!cardId || !employeeId) {
      throw ApiError.badRequest(
        "cardId and employeeId are required",
        "カードIDと社員IDは必須です",
      );
    }

    const card = await registerCard(cardId, employeeId);
    return { card };
  },
  { requiredRoles: ["ADMIN"] as Role[], successStatus: 201 },
);
