import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/organization/positions
 * 全役職一覧を取得（管理者のみ）
 */
export const GET = apiHandler(async () => {
  const positions = await prisma.positionMaster.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return { positions };
}, { admin: true });

/**
 * POST /api/admin/organization/positions
 * 役職を作成（管理者のみ）
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { code, name, nameJa, level, isManager, color, displayOrder } = body;

  if (!code || !name || !nameJa) {
    throw ApiError.badRequest("Code, name, and nameJa are required");
  }

  // 重複チェック
  const existing = await prisma.positionMaster.findUnique({
    where: { code },
  });
  if (existing) {
    throw ApiError.conflict("Position code already exists");
  }

  const position = await prisma.positionMaster.create({
    data: {
      code,
      name,
      nameJa,
      level: level || "STAFF",
      isManager: isManager ?? false,
      color: color || null,
      displayOrder: displayOrder ?? 0,
    },
  });

  return { position };
}, { admin: true, successStatus: 201 });
