import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const MANAGER_ROLES: Role[] = ["MANAGER", "EXECUTIVE", "ADMIN"];

export const GET = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search") || "";

  const where: Record<string, unknown> = { isActive: true };

  if (type === "OFFICIAL") {
    where.type = "OFFICIAL";
  } else if (type === "PERSONAL") {
    where.type = "PERSONAL";
    where.createdBy = userId;
  } else {
    where.OR = [
      { type: "OFFICIAL" as const },
      { type: "PERSONAL" as const, createdBy: userId },
    ];
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const groups = await prisma.group.findMany({
    where,
    include: {
      members: {
        include: {
          employee: {
            select: { id: true, name: true, employeeId: true, position: true },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const result = groups.map((g) => ({
    ...g,
    memberCount: g.members.length,
    leader: g.members.find((m) => m.role === "LEADER")?.employee || null,
  }));

  return { groups: result };
}, {});

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const body = await request.json();

  if (!body.name?.trim()) {
    throw ApiError.badRequest("Name is required", "グループ名は必須です");
  }

  const groupType = body.type === "OFFICIAL" ? "OFFICIAL" : "PERSONAL";

  if (groupType === "OFFICIAL" && !MANAGER_ROLES.includes(role)) {
    throw ApiError.forbidden(
      "Only MANAGER or above can create official groups",
      "公式グループの作成にはMANAGER以上の権限が必要です",
    );
  }

  const group = await prisma.group.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      type: groupType,
      createdBy: userId,
    },
  });

  return { group };
}, { successStatus: 201 });
