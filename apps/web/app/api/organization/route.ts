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
 * - referenceDate: 基準日（YYYY-MM-DD）。指定時は EmployeeHistory / OrganizationHistory から
 *                  その時点のスナップショットを復元する
 *
 * organizationId未指定時の優先順位:
 * 1. PUBLISHED状態の組織
 * 2. SCHEDULED状態の組織（公開日が過ぎている場合は自動的にPUBLISHEDに更新）
 * 3. 該当なし → null（DRAFT組織は返さない）
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const referenceDateStr = searchParams.get("referenceDate");

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

  // 基準日が今日かどうかを判定（JST基準）
  const todayJSTStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const isToday = !referenceDateStr || referenceDateStr === todayJSTStr;

  if (!isToday && referenceDateStr) {
    // === 基準日モード: EmployeeHistory からスナップショットを復元 ===
    // 基準日をJSTの日境界で解析（サーバーTZに依存しない）
    const refDateStartJST = new Date(referenceDateStr + "T00:00:00+09:00");
    const refDateEndJST = new Date(referenceDateStr + "T23:59:59.999+09:00");

    const histories = await prisma.employeeHistory.findMany({
      where: {
        organizationId: organization.id,
        validFrom: { lte: refDateEndJST },
        OR: [
          { validTo: null },
          { validTo: { gt: refDateEndJST } },
        ],
      },
    });

    // 退職日による在籍判定（退職日 = 最終在籍日）
    // retirementDate が null OR retirementDate（JST日付） >= 基準日
    const activeHistories = histories.filter((h) => {
      if (!h.isActive) return false;
      if (!h.retirementDate) return true;
      return h.retirementDate >= refDateStartJST;
    });

    // 部門構造を EmployeeHistory の非正規化データから復元
    const deptMap = new Map<string, {
      id: string;
      name: string;
      sections: Map<string, {
        id: string;
        name: string;
        courses: Map<string, { id: string; name: string; employees: typeof activeHistories }>;
        employees: typeof activeHistories;
      }>;
      employees: typeof activeHistories;
    }>();

    for (const h of activeHistories) {
      // Department
      if (!deptMap.has(h.departmentId)) {
        deptMap.set(h.departmentId, {
          id: h.departmentId,
          name: h.departmentName,
          sections: new Map(),
          employees: [],
        });
      }
      const dept = deptMap.get(h.departmentId)!;

      if (h.sectionId && h.sectionName) {
        // Section
        if (!dept.sections.has(h.sectionId)) {
          dept.sections.set(h.sectionId, {
            id: h.sectionId,
            name: h.sectionName,
            courses: new Map(),
            employees: [],
          });
        }
        const sect = dept.sections.get(h.sectionId)!;

        if (h.courseId && h.courseName) {
          // Course
          if (!sect.courses.has(h.courseId)) {
            sect.courses.set(h.courseId, {
              id: h.courseId,
              name: h.courseName,
              employees: [],
            });
          }
          sect.courses.get(h.courseId)!.employees.push(h);
        } else {
          sect.employees.push(h);
        }
      } else {
        dept.employees.push(h);
      }
    }

    // 現在の責任者情報を取得（履歴がないため現在値で代用）
    type ManagerInfo = { id: string; name: string; position: string } | null;
    const managerSelect = { select: { id: true, name: true, position: true } } as const;

    const [deptManagers, sectManagers, courseManagers] = await Promise.all([
      prisma.department.findMany({
        where: { organizationId: organization.id },
        select: { id: true, manager: managerSelect },
      }),
      prisma.section.findMany({
        where: { department: { organizationId: organization.id } },
        select: { id: true, manager: managerSelect },
      }),
      prisma.course.findMany({
        where: { section: { department: { organizationId: organization.id } } },
        select: { id: true, manager: managerSelect },
      }),
    ]);

    const deptManagerMap = new Map<string, ManagerInfo>(
      deptManagers.map((d) => [d.id, d.manager]),
    );
    const sectManagerMap = new Map<string, ManagerInfo>(
      sectManagers.map((s) => [s.id, s.manager]),
    );
    const courseManagerMap = new Map<string, ManagerInfo>(
      courseManagers.map((c) => [c.id, c.manager]),
    );

    // 部門を名前順にソート
    const formattedDepartments = Array.from(deptMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, "ja"))
      .map((dept) => {
        const sections = Array.from(dept.sections.values())
          .sort((a, b) => a.name.localeCompare(b.name, "ja"))
          .map((sect) => {
            const courses = Array.from(sect.courses.values())
              .sort((a, b) => a.name.localeCompare(b.name, "ja"))
              .map((course) => ({
                id: course.id,
                name: course.name,
                code: null as string | null,
                employeeCount: course.employees.length,
                manager: courseManagerMap.get(course.id) ?? null,
              }));
            return {
              id: sect.id,
              name: sect.name,
              code: null as string | null,
              employeeCount: sect.employees.length + courses.reduce((sum, c) => sum + c.employeeCount, 0),
              manager: sectManagerMap.get(sect.id) ?? null,
              courses,
            };
          });
        const totalDeptEmployees = dept.employees.length + sections.reduce((sum, s) => sum + s.employeeCount, 0);
        return {
          id: dept.id,
          name: dept.name,
          code: null as string | null,
          employeeCount: totalDeptEmployees,
          manager: deptManagerMap.get(dept.id) ?? null,
          sections,
        };
      });

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        employeeCount: activeHistories.length,
      },
      departments: formattedDepartments,
      referenceDate: referenceDateStr,
    };
  }

  // === 通常モード（今日の組織） ===
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
