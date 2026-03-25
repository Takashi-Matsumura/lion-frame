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
  const fiscalYearParam = url.searchParams.get("fiscalYear");
  const archivedParam = url.searchParams.get("archived") || "false";

  const where: Record<string, unknown> = { isActive: true };

  if (type === "OFFICIAL") {
    where.type = "OFFICIAL";

    // アーカイブフィルタ（公式グループのみ）
    if (archivedParam === "false") {
      where.archivedAt = null;
    } else if (archivedParam === "true") {
      where.archivedAt = { not: null };
    }
    // "all" の場合はフィルタなし

    // 年度フィルタ
    if (fiscalYearParam === "ongoing") {
      where.fiscalYear = null;
    } else if (fiscalYearParam && fiscalYearParam !== "all") {
      const fy = parseInt(fiscalYearParam, 10);
      if (!isNaN(fy)) {
        where.fiscalYear = fy;
      }
    }
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

  // オーナー（作成者）のUser名を一括取得
  const creatorIds = [...new Set(groups.map((g) => g.createdBy))];
  const creators = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true },
  });
  const creatorMap = new Map(creators.map((u) => [u.id, u.name]));

  const result = groups.map((g) => ({
    ...g,
    ownerName: creatorMap.get(g.createdBy) || null,
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

  // 公式グループの場合、年度を設定（デフォルト: 当年度）
  let fiscalYear: number | null = null;
  if (groupType === "OFFICIAL") {
    if (body.fiscalYear === null) {
      fiscalYear = null; // 通年グループ
    } else if (typeof body.fiscalYear === "number") {
      fiscalYear = body.fiscalYear;
    } else {
      // デフォルト: 当年度（4月始まり）
      const now = new Date();
      const jstMonth = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getMonth() + 1;
      const jstYear = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getFullYear();
      fiscalYear = jstMonth >= 4 ? jstYear : jstYear - 1;
    }
  }

  const group = await prisma.group.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      type: groupType,
      createdBy: userId,
      fiscalYear,
    },
  });

  return { group };
}, { successStatus: 201 });
