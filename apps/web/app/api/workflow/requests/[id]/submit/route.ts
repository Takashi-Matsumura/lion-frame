import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { WorkflowService } from "@/lib/services/workflow-service";

export const POST = apiHandler(async (request, session) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const idIndex = segments.indexOf("requests") + 1;
  const id = segments[idIndex];
  if (!id) throw ApiError.badRequest("Invalid request ID");

  const employee = await WorkflowService.getEmployeeByEmail(session.user?.email ?? "");
  if (!employee) throw ApiError.badRequest("Employee record not found", "従業員レコードが見つかりません");

  const result = await WorkflowService.submit(id, employee.id, session.user?.id);
  return { request: result };
}, {});
