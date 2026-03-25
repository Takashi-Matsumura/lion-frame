import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler(async (_request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const result = await prisma.group.findMany({
    where: { type: "OFFICIAL", isActive: true, fiscalYear: { not: null } },
    select: { fiscalYear: true },
    distinct: ["fiscalYear"],
    orderBy: { fiscalYear: "desc" },
  });

  const years = result.map((r) => r.fiscalYear as number);

  return { years };
}, {});
