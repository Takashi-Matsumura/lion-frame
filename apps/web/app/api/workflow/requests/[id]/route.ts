import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { WorkflowService } from "@/lib/services/workflow-service";

export const GET = apiHandler(async (request) => {
  const id = new URL(request.url).pathname.split("/").pop()!;
  const result = await WorkflowService.getRequest(id);
  if (!result) throw ApiError.notFound("Request not found", "申請が見つかりません");
  return { request: result };
}, {});

export const PUT = apiHandler(async (request, session) => {
  const id = new URL(request.url).pathname.split("/workflow/requests/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Invalid request ID");

  const body = await request.json();
  const { title, formData, templateId } = body;

  const employee = await WorkflowService.getEmployeeByEmail(session.user?.email ?? "");
  if (!employee) throw ApiError.badRequest("Employee record not found", "従業員レコードが見つかりません");

  const result = await WorkflowService.updateDraft(id, employee.id, { title, formData, templateId });
  return { request: result };
}, {});
