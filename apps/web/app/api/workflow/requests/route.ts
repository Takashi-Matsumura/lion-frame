import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { WorkflowService } from "@/lib/services/workflow-service";

export const GET = apiHandler(async (request, session) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;

  const employee = await WorkflowService.getEmployeeByEmail(session.user?.email ?? "");
  if (!employee) throw ApiError.badRequest("Employee record not found", "従業員レコードが見つかりません");

  const requests = await WorkflowService.getMyRequests(employee.id, { status });
  return { requests };
}, {});

export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { templateId, title, formData } = body;

  if (!templateId || !title) {
    throw ApiError.badRequest("templateId and title are required", "テンプレートIDと件名は必須です");
  }

  const employee = await WorkflowService.getEmployeeByEmail(session.user?.email ?? "");
  if (!employee) throw ApiError.badRequest("Employee record not found", "従業員レコードが見つかりません");

  const result = await WorkflowService.createDraft(
    employee.id,
    templateId,
    title,
    formData || {},
  );
  return { request: result };
}, { successStatus: 201 });
