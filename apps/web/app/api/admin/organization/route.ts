import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/organization
 *
 * 組織一覧を取得
 */
export const GET = apiHandler(async () => {
  const organizations = await prisma.organization.findMany({
    include: {
      departments: {
        include: {
          sections: {
            include: {
              courses: true,
            },
          },
          _count: {
            select: { employees: true },
          },
        },
      },
      _count: {
        select: { employees: true },
      },
    },
  });

  return { organizations };
}, { admin: true });

/**
 * POST /api/admin/organization
 *
 * 組織を作成
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { name, description } = body;

  if (!name) {
    throw ApiError.badRequest("Organization name is required");
  }

  const existing = await prisma.organization.findUnique({
    where: { name },
  });

  if (existing) {
    throw ApiError.conflict("Organization already exists");
  }

  const organization = await prisma.organization.create({
    data: {
      name,
      description,
    },
  });

  return { organization };
}, { admin: true, successStatus: 201 });
