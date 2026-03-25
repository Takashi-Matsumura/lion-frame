import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

async function getGroupOrThrow(id: string) {
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              nameKana: true,
              position: true,
              departmentId: true,
              sectionId: true,
              courseId: true,
              department: { select: { name: true } },
              section: { select: { name: true } },
              course: { select: { name: true } },
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
    },
  });
  if (!group) throw ApiError.notFound("Group not found", "グループが見つかりません");
  return group;
}

function checkAccess(
  group: { type: string; createdBy: string },
  userId: string,
  role: Role,
) {
  if (role === "ADMIN") return;
  if (group.createdBy === userId) return;
  if (group.type === "PERSONAL") {
    throw ApiError.forbidden(
      "You can only access your own personal groups",
      "自分の個人グループのみアクセスできます",
    );
  }
}

function checkEditAccess(
  group: { type: string; createdBy: string },
  userId: string,
  role: Role,
) {
  if (role === "ADMIN") return;
  if (group.createdBy === userId) return;
  throw ApiError.forbidden(
    "Only the creator or ADMIN can edit this group",
    "グループの編集は作成者またはADMINのみ可能です",
  );
}

export const GET = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const id = new URL(request.url).pathname.split("/").pop()!;
  const group = await getGroupOrThrow(id);
  checkAccess(group, userId, role);

  const owner = await prisma.user.findUnique({
    where: { id: group.createdBy },
    select: { name: true },
  });

  return {
    group: {
      ...group,
      ownerName: owner?.name || null,
      memberCount: group.members.length,
      leader: group.members.find((m) => m.role === "LEADER")?.employee || null,
    },
  };
}, {});

export const PUT = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const id = new URL(request.url).pathname.split("/").pop()!;
  const existing = await getGroupOrThrow(id);
  checkEditAccess(existing, userId, role);

  if (existing.archivedAt) {
    throw ApiError.badRequest(
      "Archived groups cannot be edited",
      "アーカイブ済みのグループは編集できません",
    );
  }

  const body = await request.json();
  if (!body.name?.trim()) {
    throw ApiError.badRequest("Name is required", "グループ名は必須です");
  }

  const data: Record<string, unknown> = {
    name: body.name.trim(),
    description: body.description?.trim() || null,
  };

  // 公式グループの年度変更
  if (existing.type === "OFFICIAL" && "fiscalYear" in body) {
    data.fiscalYear = body.fiscalYear === null ? null : (typeof body.fiscalYear === "number" ? body.fiscalYear : existing.fiscalYear);
  }

  const group = await prisma.group.update({
    where: { id },
    data,
  });

  return { group };
}, {});

export const DELETE = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const id = new URL(request.url).pathname.split("/").pop()!;
  const existing = await getGroupOrThrow(id);
  checkEditAccess(existing, userId, role);

  await prisma.group.delete({ where: { id } });

  return { success: true };
}, {});
