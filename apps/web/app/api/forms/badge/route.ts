import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";

const NEW_DAYS = 7;

export const GET = apiHandler(async (_request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const since = new Date(Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000);

  // 最近公開された未回答フォーム数
  const count = await prisma.form.count({
    where: {
      status: "PUBLISHED",
      updatedAt: { gte: since },
      submissions: {
        none: {
          submittedBy: userId,
          status: "SUBMITTED",
        },
      },
    },
  });

  return { count };
}, {});
