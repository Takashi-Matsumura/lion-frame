import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const groupId = segments[segments.indexOf("groups") + 1];

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw ApiError.notFound("Group not found", "グループが見つかりません");

  if (role !== "ADMIN" && group.createdBy !== userId) {
    throw ApiError.forbidden(
      "Only the creator or ADMIN can manage members",
      "メンバー管理は作成者またはADMINのみ可能です",
    );
  }

  const body = await request.json();
  const employeeIds: string[] = Array.isArray(body.employeeIds)
    ? body.employeeIds
    : [body.employeeId];
  const memberRole = body.role === "LEADER" ? "LEADER" : "MEMBER";

  if (employeeIds.length === 0) {
    throw ApiError.badRequest("At least one employee is required", "社員を1名以上指定してください");
  }

  const created = await prisma.$transaction(
    employeeIds.map((empId) =>
      prisma.groupMember.upsert({
        where: { groupId_employeeId: { groupId, employeeId: empId } },
        create: { groupId, employeeId: empId, role: memberRole },
        update: {},
      }),
    ),
  );

  return { members: created };
}, { successStatus: 201 });
