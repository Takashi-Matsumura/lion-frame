import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/positions
 * 有効な役職一覧を取得（認証ユーザ）
 */
export const GET = apiHandler(async () => {
  const positions = await prisma.positionMaster.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      nameJa: true,
      level: true,
      isManager: true,
      color: true,
      displayOrder: true,
    },
  });

  return { positions };
});
