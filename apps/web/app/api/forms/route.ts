import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { FormsService } from "@/lib/addon-modules/forms/forms-service";
import type { Role } from "@prisma/client";

export const GET = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const url = new URL(request.url);
  const context = url.searchParams.get("context") === "manager" ? "manager" : "user";
  const forms = await FormsService.listForms(userId, role, context as "user" | "manager");
  return { forms };
}, {});

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const body = await request.json();
  if (!body.title) {
    throw ApiError.badRequest("Title is required", "タイトルは必須です");
  }

  const form = await FormsService.upsertForm(null, userId, body);
  return { form };
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[], successStatus: 201 });
