import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { WorkflowService } from "@/lib/services/workflow-service";

export const POST = apiHandler(async (request, session) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const idIndex = segments.indexOf("approvals") + 1;
  const id = segments[idIndex];
  if (!id) throw ApiError.badRequest("Invalid approval ID");

  const body = await request.json().catch(() => ({}));
  const { comment } = body as { comment?: string };

  const employee = await WorkflowService.getEmployeeByEmail(session.user?.email ?? "");
  if (!employee) throw ApiError.badRequest("Employee record not found", "従業員レコードが見つかりません");

  const result = await WorkflowService.reject(id, employee.id, session.user?.id, comment);
  return { request: result };
}, { requiredRole: "MANAGER" });
