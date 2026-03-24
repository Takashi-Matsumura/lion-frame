import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { PdfTemplateService } from "@/lib/addon-modules/pdf/pdf-template-service";

export const GET = apiHandler(async () => {
  const templates = await PdfTemplateService.listTemplates();
  return { templates };
}, {});

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const body = await request.json();
  if (!body.name?.trim()) {
    throw ApiError.badRequest("Template name is required", "テンプレート名は必須です");
  }

  const template = await PdfTemplateService.createTemplate(body, userId);
  return { template };
}, { admin: true, successStatus: 201 });
