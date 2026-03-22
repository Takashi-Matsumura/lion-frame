import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { HealthCheckupService } from "@/lib/addon-modules/health-checkup/health-checkup-service";
import type { HealthCheckupStatus, Role } from "@prisma/client";

const validStatuses: HealthCheckupStatus[] = ["NOT_BOOKED", "PENDING", "BOOKED", "VISITED", "COMPLETED", "EXEMPT"];

export const PATCH = apiHandler(async (request) => {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const recordId = parts[parts.length - 1];
  if (!recordId) throw ApiError.badRequest("Record ID is required");

  const body = await request.json();
  if (!body.status || !validStatuses.includes(body.status)) {
    throw ApiError.badRequest("Invalid status", "無効なステータスです");
  }

  const record = await HealthCheckupService.updateRecordStatus(
    recordId,
    body.status,
    body.confirmedDate,
  );
  return { record };
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });
