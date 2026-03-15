import { apiHandler } from "@/lib/api/api-handler";
import { listActiveEmployeesWithNfc } from "@/lib/addon-modules/nfc-card/nfc-card-service";
import type { Role } from "@prisma/client";

/**
 * GET /api/nfc-card/employees — アクティブ社員一覧（NFCカード情報付き）
 */
export const GET = apiHandler(
  async () => {
    const employees = await listActiveEmployeesWithNfc();
    return { employees };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);
