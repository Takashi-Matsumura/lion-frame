import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { FormsService } from "@/lib/addon-modules/forms/forms-service";
import type { Role } from "@prisma/client";

export const GET = apiHandler(async (request, _session) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/api/forms/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Form ID is required");

  const responses = await FormsService.getResponses(id);
  return { responses };
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });
