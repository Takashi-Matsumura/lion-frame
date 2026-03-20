import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * GET /api/forms/[id]/responses/status
 *
 * フォームの回答状況を部署別に返す
 * - 全アクティブ社員を対象
 * - User.email = Employee.email で紐付け
 */
export const GET = apiHandler(
  async (request, _session) => {
    const url = new URL(request.url);
    const formId = url.pathname.split("/api/forms/")[1]?.split("/")[0];
    if (!formId) throw ApiError.badRequest("Form ID is required");

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { id: true, title: true, titleJa: true, status: true },
    });
    if (!form) throw ApiError.notFound("Form not found");

    // 回答済みユーザIDを取得
    const submissions = await prisma.formSubmission.findMany({
      where: { formId, status: "SUBMITTED" },
      select: {
        submittedBy: true,
        submittedAt: true,
        submitter: { select: { id: true, email: true, name: true } },
      },
    });
    const respondedUserIds = new Set(submissions.map((s) => s.submittedBy));
    const respondedEmailMap = new Map(
      submissions.map((s) => [s.submitter.email, s.submittedAt]),
    );

    // 全アクティブ社員（部署付き）を取得
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: { department: { select: { id: true, name: true } } },
      orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
    });

    // 社員に紐づくUserを一括取得
    const employeeEmails = employees.map((e) => e.email).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { email: { in: employeeEmails } },
      select: { id: true, email: true },
    });
    const emailToUserId = new Map(users.map((u) => [u.email, u.id]));

    // 部署別に集計
    const deptMap = new Map<
      string,
      {
        id: string;
        name: string;
        responded: { employeeId: string; name: string; email: string; respondedAt: string | null }[];
        notResponded: { employeeId: string; name: string; email: string; userId: string | null }[];
      }
    >();

    for (const emp of employees) {
      // グループ会社統合: 部署名でグルーピング（異なるOrganizationの同名部署をまとめる）
      const deptName = emp.department?.name || "未所属";

      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, { id: deptName, name: deptName, responded: [], notResponded: [] });
      }
      const dept = deptMap.get(deptName)!;

      const userId = emailToUserId.get(emp.email ?? "");
      const hasResponded = userId ? respondedUserIds.has(userId) : false;

      if (hasResponded) {
        dept.responded.push({
          employeeId: emp.employeeId,
          name: emp.name,
          email: emp.email ?? "",
          respondedAt: respondedEmailMap.get(emp.email ?? "")?.toISOString() ?? null,
        });
      } else {
        dept.notResponded.push({
          employeeId: emp.employeeId,
          name: emp.name,
          email: emp.email ?? "",
          userId: userId ?? null,
        });
      }
    }

    const departments = Array.from(deptMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const totalEmployees = employees.length;
    const totalResponded = departments.reduce((sum, d) => sum + d.responded.length, 0);

    return {
      formId,
      totalEmployees,
      totalResponded,
      totalNotResponded: totalEmployees - totalResponded,
      responseRate: totalEmployees > 0 ? Math.round((totalResponded / totalEmployees) * 100) : 0,
      departments,
    };
  },
  { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] },
);
