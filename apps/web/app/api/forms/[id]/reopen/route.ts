import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { FormsService } from "@/lib/addon-modules/forms/forms-service";
import type { Role } from "@prisma/client";

export const POST = apiHandler(async (request, _session) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/api/forms/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Form ID is required");

  try {
    const form = await FormsService.reopenForm(id);
    if (!form) throw ApiError.notFound("Form not found", "フォームが見つかりません");
    return { form };
  } catch (e) {
    throw ApiError.badRequest(
      (e as Error).message,
      (e as Error).message,
    );
  }
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });
