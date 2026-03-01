import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api/api-handler";

export const GET = apiHandler(async () => {
  const templates = await prisma.workflowTemplate.findMany({
    where: { isActive: true },
    orderBy: { type: "asc" },
  });
  return { templates };
}, {});
