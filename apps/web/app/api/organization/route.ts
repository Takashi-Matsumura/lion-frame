import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization
 *
 * 組織構造（ツリー用）を取得
 * 本部 → 部 → 課の階層構造と各レベルの社員数を返す
 *
 * Query Parameters:
 * - organizationId: 指定時はその組織を直接返す（管理画面用）
 *
 * organizationId未指定時の優先順位:
 * 1. PUBLISHED状態の組織
 * 2. SCHEDULED状態の組織（公開日が過ぎている場合は自動的にPUBLISHEDに更新）
 * 3. 該当なし → null（DRAFT組織は返さない）
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  let organization: { id: string; name: string } | null = null;

  if (organizationId) {
    // 指定IDの組織を直接取得（管理画面からの利用）
    organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
  } else {
    // PUBLISHED/SCHEDULED検索を並列実行（async-parallel）
    const [published, scheduled] = await Promise.all([
      prisma.organization.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
      }),
      prisma.organization.findFirst({
        where: {
          status: "SCHEDULED",
          publishAt: { lte: new Date() },
        },
        orderBy: { publishAt: "asc" },
      }),
    ]);

    if (published) {
      organization = published;
    } else if (scheduled) {
      // 既存のPUBLISHED組織をアーカイブ
      await prisma.organization.updateMany({
        where: { status: "PUBLISHED" },
        data: { status: "ARCHIVED" },
      });

      // この組織をPUBLISHEDに更新
      organization = await prisma.organization.update({
        where: { id: scheduled.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    }
  }

  if (!organization) {
    return {
      organization: null,
      departments: [],
    };
  }

  // 本部一覧を取得（社員数、部、課を含む）
  // 本部・部・課: 所属コード順（昇順）でソート
  const departments = await prisma.department.findMany({
    where: { organizationId: organization.id },
    orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    include: {
      _count: {
        select: { employees: { where: { isActive: true } } },
      },
      manager: {
        select: { id: true, name: true, position: true },
      },
      sections: {
        orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
        include: {
          _count: {
            select: { employees: { where: { isActive: true } } },
          },
          manager: {
            select: { id: true, name: true, position: true },
          },
          courses: {
            orderBy: [
              { code: { sort: "asc", nulls: "last" } },
              { name: "asc" },
            ],
            include: {
              _count: {
                select: { employees: { where: { isActive: true } } },
              },
              manager: {
                select: { id: true, name: true, position: true },
              },
            },
          },
        },
      },
    },
  });

  // レスポンス用に整形
  const formattedDepartments = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    employeeCount: dept._count.employees,
    manager: dept.manager,
    sections: dept.sections.map((sect) => ({
      id: sect.id,
      name: sect.name,
      code: sect.code,
      employeeCount: sect._count.employees,
      manager: sect.manager,
      courses: sect.courses.map((course) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        employeeCount: course._count.employees,
        manager: course.manager,
      })),
    })),
  }));

  // 全体の社員数を計算
  const totalEmployees = await prisma.employee.count({
    where: {
      organizationId: organization.id,
      isActive: true,
    },
  });

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      employeeCount: totalEmployees,
    },
    departments: formattedDepartments,
  };
});
