import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { FormsService } from "@/lib/addon-modules/forms/forms-service";

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const url = new URL(request.url);
  const id = url.pathname.split("/api/forms/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Form ID is required");

  const body = await request.json();
  const { answers } = body;
  if (!Array.isArray(answers)) {
    throw ApiError.badRequest("Answers array is required", "回答データが必要です");
  }

  try {
    const submission = await FormsService.submitForm(id, userId, answers);
    return { submission };
  } catch (e) {
    throw ApiError.badRequest(
      (e as Error).message,
      (e as Error).message,
    );
  }
}, { successStatus: 201 });
