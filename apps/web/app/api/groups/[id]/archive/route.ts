import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

function checkEditAccess(
  group: { createdBy: string },
  userId: string,
  role: Role,
) {
  if (role === "ADMIN") return;
  if (group.createdBy === userId) return;
  throw ApiError.forbidden(
    "Only the creator or ADMIN can archive this group",
    "アーカイブ操作は作成者またはADMINのみ可能です",
  );
}

// POST: アーカイブ
export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const id = new URL(request.url).pathname.split("/").at(-2)!;

  const group = await prisma.group.findUnique({
    where: { id },
    include: { members: { select: { employeeId: true, role: true } } },
  });
  if (!group) throw ApiError.notFound("Group not found", "グループが見つかりません");

  checkEditAccess(group, userId, role);

  if (group.archivedAt) {
    throw ApiError.badRequest("Group is already archived", "既にアーカイブ済みです");
  }

  // 常設グループ（fiscalYear === null）の場合、スナップショットを自動作成
  if (group.fiscalYear === null && group.type === "OFFICIAL") {
    const now = new Date();
    const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const currentFY = jst.getMonth() + 1 >= 4 ? jst.getFullYear() : jst.getFullYear() - 1;

    // 同名・同年度のスナップショットが無い場合のみ作成
    const existing = await prisma.group.findFirst({
      where: { name: group.name, type: "OFFICIAL", fiscalYear: currentFY, isActive: true },
    });
    if (!existing) {
      await prisma.group.create({
        data: {
          name: group.name,
          description: group.description,
          type: "OFFICIAL",
          createdBy: userId,
          fiscalYear: currentFY,
          archivedAt: new Date(),
          members: {
            create: group.members.map((m) => ({
              employeeId: m.employeeId,
              role: m.role,
            })),
          },
        },
      });
    }
  }

  const updated = await prisma.group.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  return { group: updated };
}, {});

// DELETE: アーカイブ解除
export const DELETE = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const id = new URL(request.url).pathname.split("/").at(-2)!;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw ApiError.notFound("Group not found", "グループが見つかりません");

  checkEditAccess(group, userId, role);

  if (!group.archivedAt) {
    throw ApiError.badRequest("Group is not archived", "アーカイブされていません");
  }

  const updated = await prisma.group.update({
    where: { id },
    data: { archivedAt: null },
  });

  return { group: updated };
}, {});
