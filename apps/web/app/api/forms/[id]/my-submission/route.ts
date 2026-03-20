import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { FormsService } from "@/lib/addon-modules/forms/forms-service";

export const GET = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const url = new URL(request.url);
  const id = url.pathname.split("/api/forms/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Form ID is required");

  const submission = await FormsService.getMySubmission(id, userId);
  return { submission };
}, {});
