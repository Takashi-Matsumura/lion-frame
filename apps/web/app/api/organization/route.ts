import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization
 *
 * 組織構造（ツリー用）を取得
 * 本部 → 部 → 課の階層構造と各レベルの社員数を返す
 *
 * 複数のPUBLISHED組織がある場合、共同企業体として統合表示する。
 * プライマリ組織（最も古いPUBLISHED）のツリー構造をベースに、
 * 他組織の社員数を名前マッチングで統合する。
 *
 * Query Parameters:
 * - organizationId: 指定時はその組織のみを返す（管理画面用、統合しない）
 * - referenceDate: 基準日（YYYY-MM-DD）。指定時は EmployeeHistory から
 *                  その時点のスナップショットを復元する
 *
 * organizationId未指定時の優先順位:
 * 1. PUBLISHED状態の全組織を統合表示
 * 2. SCHEDULED状態の組織（公開日が過ぎている場合は自動的にPUBLISHEDに更新）
 * 3. 該当なし → null（DRAFT組織は返さない）
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const referenceDateStr = searchParams.get("referenceDate");

  // === 組織の取得 ===
  let primaryOrg: { id: string; name: string } | null = null;
  let allPublishedOrgs: { id: string; name: string }[] = [];

  if (organizationId) {
    // 指定IDの組織を直接取得（管理画面からの利用 → 統合しない）
    primaryOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (primaryOrg) allPublishedOrgs = [primaryOrg];
  } else {
    // 全PUBLISHED組織を取得（古い順 = プライマリが最初）
    allPublishedOrgs = await prisma.organization.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "asc" },
      select: { id: true, name: true },
    });

    if (allPublishedOrgs.length === 0) {
      // SCHEDULED自動昇格
      const scheduled = await prisma.organization.findFirst({
        where: {
          status: "SCHEDULED",
          publishAt: { lte: new Date() },
        },
        orderBy: { publishAt: "asc" },
      });

      if (scheduled) {
        const promoted = await prisma.organization.update({
          where: { id: scheduled.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        });
        allPublishedOrgs = [{ id: promoted.id, name: promoted.name }];
      }
    }

    primaryOrg = allPublishedOrgs[0] ?? null;
  }

  if (!primaryOrg) {
    return {
      organization: null,
      departments: [],
    };
  }

  const allOrgIds = allPublishedOrgs.map((o) => o.id);
  const otherOrgIds = allOrgIds.filter((id) => id !== primaryOrg!.id);

  // グループ名を生成（複数組織の場合はSystemSettingの設定値、未設定なら連名）
  let groupName = primaryOrg.name;
  if (allPublishedOrgs.length > 1) {
    const groupNameSetting = await prisma.systemSetting.findUnique({
      where: { key: "organization_group_name" },
    });
    groupName = groupNameSetting?.value || allPublishedOrgs.map((o) => o.name).join(" / ");
  }

  // 基準日が今日かどうかを判定（JST基準）
  const todayJSTStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const isToday = !referenceDateStr || referenceDateStr === todayJSTStr;

  if (!isToday && referenceDateStr) {
    // === 基準日モード: EmployeeHistory からスナップショットを復元 ===
    // 基準日をJSTの日境界で解析（サーバーTZに依存しない）
    const refDateStartJST = new Date(referenceDateStr + "T00:00:00+09:00");
    const refDateEndJST = new Date(referenceDateStr + "T23:59:59.999+09:00");

    // 全PUBLISHED組織のHistoryを取得
    const histories = await prisma.employeeHistory.findMany({
      where: {
        organizationId: { in: allOrgIds },
        validFrom: { lte: refDateEndJST },
        OR: [
          { validTo: null },
          { validTo: { gt: refDateEndJST } },
        ],
      },
    });

    // 退職日による在籍判定（退職日 = 最終在籍日）
    const activeHistories = histories.filter((h) => {
      if (!h.isActive) return false;
      if (!h.retirementDate) return true;
      return h.retirementDate >= refDateStartJST;
    });

    // プライマリ組織のDept/Sect/CourseのIDマップを構築（正規化ID用）
    const primaryDepts = await prisma.department.findMany({
      where: { organizationId: primaryOrg.id },
      include: { sections: { include: { courses: true } } },
    });

    const deptNameToId = new Map<string, string>();
    const sectKeyToId = new Map<string, string>();
    const courseKeyToId = new Map<string, string>();

    for (const dept of primaryDepts) {
      deptNameToId.set(dept.name, dept.id);
      for (const sect of dept.sections) {
        sectKeyToId.set(`${dept.name}\0${sect.name}`, sect.id);
        for (const course of sect.courses) {
          courseKeyToId.set(`${dept.name}\0${sect.name}\0${course.name}`, course.id);
        }
      }
    }

    // 部門構造を departmentName でグルーピング（プライマリのIDを使用）
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
      // プライマリのIDにマッピング（なければ元のIDを使用）
      const canonDeptId = deptNameToId.get(h.departmentName) || h.departmentId;

      if (!deptMap.has(h.departmentName)) {
        deptMap.set(h.departmentName, {
          id: canonDeptId,
          name: h.departmentName,
          sections: new Map(),
          employees: [],
        });
      }
      const dept = deptMap.get(h.departmentName)!;

      if (h.sectionId && h.sectionName) {
        const sectionKey = h.sectionName;
        const canonSectId = sectKeyToId.get(`${h.departmentName}\0${h.sectionName}`) || h.sectionId;

        if (!dept.sections.has(sectionKey)) {
          dept.sections.set(sectionKey, {
            id: canonSectId,
            name: h.sectionName,
            courses: new Map(),
            employees: [],
          });
        }
        const sect = dept.sections.get(sectionKey)!;

        if (h.courseId && h.courseName) {
          const courseKey = h.courseName;
          const canonCourseId = courseKeyToId.get(`${h.departmentName}\0${h.sectionName}\0${h.courseName}`) || h.courseId;

          if (!sect.courses.has(courseKey)) {
            sect.courses.set(courseKey, {
              id: canonCourseId,
              name: h.courseName,
              employees: [],
            });
          }
          sect.courses.get(courseKey)!.employees.push(h);
        } else {
          sect.employees.push(h);
        }
      } else {
        dept.employees.push(h);
      }
    }

    // 現在の責任者情報を取得（プライマリ組織から）
    type ManagerInfo = { id: string; name: string; position: string } | null;
    const managerSelect = { select: { id: true, name: true, position: true } } as const;

    const [deptManagers, sectManagers, courseManagers] = await Promise.all([
      prisma.department.findMany({
        where: { organizationId: primaryOrg.id },
        select: { id: true, manager: managerSelect },
      }),
      prisma.section.findMany({
        where: { department: { organizationId: primaryOrg.id } },
        select: { id: true, manager: managerSelect },
      }),
      prisma.course.findMany({
        where: { section: { department: { organizationId: primaryOrg.id } } },
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
        id: primaryOrg.id,
        name: groupName,
        employeeCount: activeHistories.length,
      },
      departments: formattedDepartments,
      referenceDate: referenceDateStr,
    };
  }

  // === 通常モード（今日の組織） ===
  // プライマリ組織の本部一覧を取得（ツリーの骨格）
  const departments = await prisma.department.findMany({
    where: { organizationId: primaryOrg.id },
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

  // 他組織の社員数を名前マッチングで統合
  const extraDeptCounts = new Map<string, number>();
  const extraSectCounts = new Map<string, number>();
  const extraCourseCounts = new Map<string, number>();
  let extraTotal = 0;

  if (otherOrgIds.length > 0) {
    // プライマリ組織の名前→IDマッピング
    const deptNameToId = new Map<string, string>();
    const sectKeyToId = new Map<string, string>();
    const courseKeyToId = new Map<string, string>();

    for (const dept of departments) {
      deptNameToId.set(dept.name, dept.id);
      for (const sect of dept.sections) {
        sectKeyToId.set(`${dept.name}\0${sect.name}`, sect.id);
        for (const course of sect.courses) {
          courseKeyToId.set(`${dept.name}\0${sect.name}\0${course.name}`, course.id);
        }
      }
    }

    // 他組織のアクティブ社員を取得（名前ベースでカウント）
    const otherEmployees = await prisma.employee.findMany({
      where: { organizationId: { in: otherOrgIds }, isActive: true },
      select: {
        department: { select: { name: true } },
        section: { select: { name: true } },
        course: { select: { name: true } },
      },
    });

    extraTotal = otherEmployees.length;

    for (const emp of otherEmployees) {
      const deptName = emp.department?.name;
      if (!deptName) continue;

      // 部門レベル（このDeptに属する全社員をカウント）
      const deptId = deptNameToId.get(deptName);
      if (deptId) {
        extraDeptCounts.set(deptId, (extraDeptCounts.get(deptId) || 0) + 1);
      }

      // 部レベル
      const sectName = emp.section?.name;
      if (sectName) {
        const sectId = sectKeyToId.get(`${deptName}\0${sectName}`);
        if (sectId) {
          extraSectCounts.set(sectId, (extraSectCounts.get(sectId) || 0) + 1);
        }
      }

      // 課レベル
      const courseName = emp.course?.name;
      if (courseName && sectName) {
        const courseId = courseKeyToId.get(`${deptName}\0${sectName}\0${courseName}`);
        if (courseId) {
          extraCourseCounts.set(courseId, (extraCourseCounts.get(courseId) || 0) + 1);
        }
      }
    }
  }

  // レスポンス用に整形（統合カウント含む）
  const formattedDepartments = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    employeeCount: dept._count.employees + (extraDeptCounts.get(dept.id) || 0),
    manager: dept.manager,
    sections: dept.sections.map((sect) => ({
      id: sect.id,
      name: sect.name,
      code: sect.code,
      employeeCount: sect._count.employees + (extraSectCounts.get(sect.id) || 0),
      manager: sect.manager,
      courses: sect.courses.map((course) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        employeeCount: course._count.employees + (extraCourseCounts.get(course.id) || 0),
        manager: course.manager,
      })),
    })),
  }));

  // 全組織の社員数を計算
  const totalEmployees = await prisma.employee.count({
    where: {
      organizationId: { in: allOrgIds },
      isActive: true,
    },
  });

  return {
    organization: {
      id: primaryOrg.id,
      name: groupName,
      employeeCount: totalEmployees,
    },
    departments: formattedDepartments,
  };
});
