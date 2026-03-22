import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { FormsService } from "@/lib/addon-modules/forms/forms-service";
import { prisma } from "@/lib/prisma";
import type { FormShareScope, Role } from "@prisma/client";

export const GET = apiHandler(async (request, _session) => {
  const id = new URL(request.url).pathname.split("/").pop()!;
  const form = await FormsService.getFormById(id);
  if (!form) throw ApiError.notFound("Form not found", "フォームが見つかりません");
  return { form };
}, {});

export const PUT = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const id = new URL(request.url).pathname.split("/api/forms/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Form ID is required");

  // 公開中・締切済みフォームの編集をブロック
  const existing = await FormsService.getFormById(id);
  if (!existing) throw ApiError.notFound("Form not found", "フォームが見つかりません");
  if (existing.status !== "DRAFT") {
    throw ApiError.badRequest(
      "Cannot edit a published or closed form",
      "公開中または締切済みのフォームは編集できません。編集するには公開解除してください。",
    );
  }

  const body = await request.json();
  const form = await FormsService.upsertForm(id, userId, body);
  if (!form) throw ApiError.notFound("Form not found", "フォームが見つかりません");
  return { form };
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });

const validShareScopes: FormShareScope[] = ["PRIVATE", "SECTION", "DEPARTMENT", "ORGANIZATION"];

export const PATCH = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const id = new URL(request.url).pathname.split("/api/forms/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Form ID is required");

  const body = await request.json();

  if (body.shareScope && validShareScopes.includes(body.shareScope)) {
    await prisma.form.update({
      where: { id },
      data: { shareScope: body.shareScope },
    });
  }

  return { success: true };
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });

export const DELETE = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const id = new URL(request.url).pathname.split("/api/forms/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Form ID is required");

  try {
    await FormsService.deleteForm(id);
  } catch (e) {
    throw ApiError.badRequest(
      (e as Error).message,
      "公開中のフォームは削除できません。先に締め切ってください。",
    );
  }
  return { success: true };
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });
