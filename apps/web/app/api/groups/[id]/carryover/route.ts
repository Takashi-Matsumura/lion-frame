import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const MANAGER_ROLES: Role[] = ["MANAGER", "EXECUTIVE", "ADMIN"];

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  if (!MANAGER_ROLES.includes(role)) {
    throw ApiError.forbidden(
      "Only MANAGER or above can carry over groups",
      "グループの引継ぎにはMANAGER以上の権限が必要です",
    );
  }

  const id = new URL(request.url).pathname.split("/").at(-2)!;

  const source = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { select: { employeeId: true, role: true } },
    },
  });
  if (!source) throw ApiError.notFound("Group not found", "グループが見つかりません");

  if (source.type !== "OFFICIAL") {
    throw ApiError.badRequest(
      "Only official groups can be carried over",
      "引継ぎは公式グループのみ可能です",
    );
  }

  if (source.fiscalYear === null) {
    throw ApiError.badRequest(
      "Standing groups do not need carry-over",
      "常設グループは引継ぎの必要がありません",
    );
  }

  const body = await request.json().catch(() => ({}));
  const targetYear = typeof body.targetFiscalYear === "number"
    ? body.targetFiscalYear
    : source.fiscalYear + 1;

  // 同名・同年度のグループが既に存在するかチェック
  const existing = await prisma.group.findFirst({
    where: {
      name: source.name,
      type: "OFFICIAL",
      fiscalYear: targetYear,
      isActive: true,
    },
  });
  if (existing) {
    throw ApiError.badRequest(
      `A group with the same name already exists for FY${targetYear}`,
      `${targetYear}年度に同名のグループが既に存在します`,
    );
  }

  const newGroup = await prisma.group.create({
    data: {
      name: source.name,
      description: source.description,
      type: "OFFICIAL",
      createdBy: userId,
      fiscalYear: targetYear,
      members: {
        create: source.members.map((m) => ({
          employeeId: m.employeeId,
          role: m.role,
        })),
      },
    },
    include: {
      members: {
        include: {
          employee: {
            select: { id: true, name: true, employeeId: true, position: true },
          },
        },
      },
    },
  });

  return { group: newGroup };
}, { successStatus: 201 });
