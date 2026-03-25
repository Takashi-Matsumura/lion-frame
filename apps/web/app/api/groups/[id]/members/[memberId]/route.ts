import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

async function getGroupAndCheckAccess(
  url: URL,
  userId: string,
  role: Role,
) {
  const segments = url.pathname.split("/");
  const membersIdx = segments.indexOf("members");
  const groupId = segments[membersIdx - 1];
  const memberId = segments[membersIdx + 1];

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw ApiError.notFound("Group not found", "グループが見つかりません");

  if (role !== "ADMIN" && group.createdBy !== userId) {
    throw ApiError.forbidden(
      "Only the creator or ADMIN can manage members",
      "メンバー管理は作成者またはADMINのみ可能です",
    );
  }

  if (group.archivedAt) {
    throw ApiError.badRequest(
      "Cannot modify members of an archived group",
      "アーカイブ済みグループのメンバーは変更できません",
    );
  }

  return { group, groupId, memberId };
}

export const PATCH = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const { memberId } = await getGroupAndCheckAccess(
    new URL(request.url),
    userId,
    role,
  );

  const body = await request.json();
  const memberRole = body.role === "LEADER" ? "LEADER" : "MEMBER";

  const member = await prisma.groupMember.update({
    where: { id: memberId },
    data: { role: memberRole },
  });

  return { member };
}, {});

export const DELETE = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const { memberId } = await getGroupAndCheckAccess(
    new URL(request.url),
    userId,
    role,
  );

  await prisma.groupMember.delete({ where: { id: memberId } });

  return { success: true };
}, {});
