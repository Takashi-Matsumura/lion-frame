import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { searchEmployee } from "@/lib/addon-modules/nfc-card/nfc-card-service";
import type { Role } from "@prisma/client";

/**
 * GET /api/nfc-card/employee/[employeeId] — 社員番号で社員検索（NFCカード情報付き）
 */
export const GET = apiHandler(
  async (request) => {
    const employeeId = new URL(request.url).pathname.split("/api/nfc-card/employee/")[1];
    if (!employeeId) {
      throw ApiError.badRequest("Employee ID is required", "社員番号は必須です");
    }

    const employee = await searchEmployee(decodeURIComponent(employeeId));
    if (!employee) {
      throw ApiError.notFound(
        `Employee not found: ${employeeId}`,
        `社員が見つかりません: ${employeeId}`,
      );
    }

    return { employee };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);
