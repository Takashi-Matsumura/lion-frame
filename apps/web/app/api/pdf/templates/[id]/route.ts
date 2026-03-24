import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { PdfTemplateService } from "@/lib/addon-modules/pdf/pdf-template-service";

export const GET = apiHandler(async (request) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) throw ApiError.badRequest("Template ID is required");

  const template = await PdfTemplateService.getTemplate(id);
  if (!template) throw ApiError.notFound("Template not found", "テンプレートが見つかりません");
  return { template };
}, {});

export const PUT = apiHandler(async (request) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) throw ApiError.badRequest("Template ID is required");

  const body = await request.json();
  const template = await PdfTemplateService.updateTemplate(id, body);
  return { template };
}, { admin: true });

export const DELETE = apiHandler(async (request) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) throw ApiError.badRequest("Template ID is required");

  await PdfTemplateService.deleteTemplate(id);
  return { success: true };
}, { admin: true });
