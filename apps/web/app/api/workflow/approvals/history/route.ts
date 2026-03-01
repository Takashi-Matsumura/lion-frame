import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { WorkflowService } from "@/lib/services/workflow-service";

export const GET = apiHandler(async (_request, session) => {
  const employee = await WorkflowService.getEmployeeByEmail(session.user?.email ?? "");
  if (!employee) throw ApiError.badRequest("Employee record not found", "従業員レコードが見つかりません");

  const history = await WorkflowService.getApprovalHistory(employee.id);
  return { history };
}, { requiredRole: "MANAGER" });
