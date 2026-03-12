import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { revokeCard } from "@/lib/addon-modules/nfc-card/nfc-card-service";
import type { Role } from "@prisma/client";

/**
 * PATCH /api/nfc-card/[id] — NFCカード無効化
 */
export const PATCH = apiHandler(
  async (request) => {
    const id = new URL(request.url).pathname.split("/api/nfc-card/")[1]?.split("/")[0];
    if (!id) throw ApiError.badRequest("ID is required", "IDは必須です");

    const card = await revokeCard(id);
    return { card };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);
