import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { HealthCheckupService } from "@/lib/addon-modules/health-checkup/health-checkup-service";
import type { HealthCheckupStatus, Role } from "@prisma/client";

export const GET = apiHandler(async (request) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/api/health-checkup/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Campaign ID is required");

  const status = url.searchParams.get("status") as HealthCheckupStatus | null;
  const bookingMethod = url.searchParams.get("bookingMethod") ?? undefined;
  const departmentId = url.searchParams.get("departmentId") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;

  const records = await HealthCheckupService.getRecords(id, {
    status: status ?? undefined,
    bookingMethod,
    departmentId,
    search,
  });

  return { records };
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });
