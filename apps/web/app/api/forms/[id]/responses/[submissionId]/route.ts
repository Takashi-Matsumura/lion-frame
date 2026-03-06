import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { FormsService } from "@/lib/addon-modules/forms/forms-service";
import type { Role } from "@prisma/client";

export const GET = apiHandler(async (request, _session) => {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const submissionId = parts[parts.length - 1];
  if (!submissionId) throw ApiError.badRequest("Submission ID is required");

  const response = await FormsService.getResponseById(submissionId);
  if (!response) throw ApiError.notFound("Submission not found", "回答が見つかりません");
  return { response };
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });
