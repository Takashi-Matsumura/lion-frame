import { apiHandler } from "@/lib/api";
import { ManagerHistoryService } from "@/lib/history/manager-history-service";
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

    // 基準日時点の責任者を ManagerHistory から復元
    type ManagerInfo = { id: string; name: string; position: string } | null;
    const managerIdMap = await ManagerHistoryService.getManagersAtDate(refDateEndJST);

    // 全managerIdを収集してEmployee情報を一括取得
    const allManagerIds = new Set<string>();
    for (const mId of managerIdMap.values()) {
      if (mId) allManagerIds.add(mId);
    }

    const managerEmployees = allManagerIds.size > 0
      ? await prisma.employee.findMany({
          where: { id: { in: Array.from(allManagerIds) } },
          select: { id: true, name: true, position: true },
        })
      : [];

    const managerInfoById = new Map<string, { id: string; name: string; position: string }>(
      managerEmployees.map((e) => [e.id, { id: e.id, name: e.name, position: e.position }]),
    );

    // unitType:unitId → ManagerInfo のヘルパー
    const getManagerInfo = (unitType: string, unitId: string): ManagerInfo => {
      const mId = managerIdMap.get(`${unitType}:${unitId}`);
      if (!mId) return null;
      return managerInfoById.get(mId) ?? null;
    };

    const deptManagerMap = new Map<string, ManagerInfo>();
    const sectManagerMap = new Map<string, ManagerInfo>();
    const courseManagerMap = new Map<string, ManagerInfo>();

    for (const dept of primaryDepts) {
      deptManagerMap.set(dept.id, getManagerInfo("department", dept.id));
      for (const sect of dept.sections) {
        sectManagerMap.set(sect.id, getManagerInfo("section", sect.id));
        for (const course of sect.courses) {
          courseManagerMap.set(course.id, getManagerInfo("course", course.id));
        }
      }
    }

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

  // 統合用: formatted unit の型
  type FormattedCourse = {
    id: string; name: string; code: string | null;
    employeeCount: number;
    manager: { id: string; name: string; position: string } | null;
  };
  type FormattedSection = FormattedCourse & { courses: FormattedCourse[] };
  type FormattedDept = FormattedCourse & { sections: FormattedSection[] };

  // プライマリの部門→セクション→コースのマッピング（追加分を後で統合するため）
  // key: deptName, value: { key: sectKey, extraSections, extraCourses }
  const extraSectsByDept = new Map<string, FormattedSection[]>();
  const extraCoursesBySect = new Map<string, FormattedCourse[]>();
  const extraDepts: FormattedDept[] = [];

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

    // 他組織の部門構造を取得（プライマリにない部署を発見するため）
    const otherDepartments = await prisma.department.findMany({
      where: { organizationId: { in: otherOrgIds } },
      orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      include: {
        _count: { select: { employees: { where: { isActive: true } } } },
        manager: { select: { id: true, name: true, position: true } },
        sections: {
          orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
          include: {
            _count: { select: { employees: { where: { isActive: true } } } },
            manager: { select: { id: true, name: true, position: true } },
            courses: {
              orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
              include: {
                _count: { select: { employees: { where: { isActive: true } } } },
                manager: { select: { id: true, name: true, position: true } },
              },
            },
          },
        },
      },
    });

    // 処理済みの他組織ユニット名を追跡（重複排除用）
    const addedDeptNames = new Set<string>();
    const addedSectKeys = new Set<string>();
    const addedCourseKeys = new Set<string>();

    for (const otherDept of otherDepartments) {
      const deptId = deptNameToId.get(otherDept.name);

      if (deptId) {
        // プライマリに同名部門がある → 社員数を加算
        extraDeptCounts.set(deptId, (extraDeptCounts.get(deptId) || 0) + otherDept._count.employees);
        extraTotal += otherDept._count.employees;

        for (const otherSect of otherDept.sections) {
          const sectId = sectKeyToId.get(`${otherDept.name}\0${otherSect.name}`);
          if (sectId) {
            // プライマリに同名部がある
            extraSectCounts.set(sectId, (extraSectCounts.get(sectId) || 0) + otherSect._count.employees);
            for (const otherCourse of otherSect.courses) {
              const courseId = courseKeyToId.get(`${otherDept.name}\0${otherSect.name}\0${otherCourse.name}`);
              if (courseId) {
                extraCourseCounts.set(courseId, (extraCourseCounts.get(courseId) || 0) + otherCourse._count.employees);
              } else {
                // プライマリにない課 → formatted段階で追加
                const courseKey = `${otherDept.name}\0${otherSect.name}\0${otherCourse.name}`;
                if (!addedCourseKeys.has(courseKey)) {
                  addedCourseKeys.add(courseKey);
                  const sectCompositeKey = `${otherDept.name}\0${otherSect.name}`;
                  if (!extraCoursesBySect.has(sectCompositeKey)) {
                    extraCoursesBySect.set(sectCompositeKey, []);
                  }
                  extraCoursesBySect.get(sectCompositeKey)!.push({
                    id: otherCourse.id,
                    name: otherCourse.name,
                    code: otherCourse.code,
                    employeeCount: otherCourse._count.employees,
                    manager: otherCourse.manager,
                  });
                }
              }
            }
          } else {
            // プライマリにない部 → formatted段階で追加
            const sectKey = `${otherDept.name}\0${otherSect.name}`;
            if (!addedSectKeys.has(sectKey)) {
              addedSectKeys.add(sectKey);
              if (!extraSectsByDept.has(otherDept.name)) {
                extraSectsByDept.set(otherDept.name, []);
              }
              const sectEmployeeCount = otherSect._count.employees;
              extraSectsByDept.get(otherDept.name)!.push({
                id: otherSect.id,
                name: otherSect.name,
                code: otherSect.code,
                employeeCount: sectEmployeeCount,
                manager: otherSect.manager,
                courses: otherSect.courses.map(c => ({
                  id: c.id, name: c.name, code: c.code,
                  employeeCount: c._count.employees,
                  manager: c.manager,
                })),
              });
            }
          }
        }
      } else {
        // プライマリに同名部門がない → 新規部門として追加
        if (!addedDeptNames.has(otherDept.name)) {
          addedDeptNames.add(otherDept.name);
          extraTotal += otherDept._count.employees;

          extraDepts.push({
            id: otherDept.id,
            name: otherDept.name,
            code: otherDept.code,
            employeeCount: otherDept._count.employees,
            manager: otherDept.manager,
            sections: otherDept.sections.map(s => ({
              id: s.id,
              name: s.name,
              code: s.code,
              employeeCount: s._count.employees,
              manager: s.manager,
              courses: s.courses.map(c => ({
                id: c.id, name: c.name, code: c.code,
                employeeCount: c._count.employees,
                manager: c.manager,
              })),
            })),
          });
        }
      }
    }
  }

  // レスポンス用に整形（統合カウント含む）
  const formattedDepartments: FormattedDept[] = departments.map((dept) => {
    const sections: FormattedSection[] = dept.sections.map((sect) => {
      const courses: FormattedCourse[] = sect.courses.map((course) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        employeeCount: course._count.employees + (extraCourseCounts.get(course.id) || 0),
        manager: course.manager,
      }));
      // 他組織にのみ存在する課を追加
      const extraCourses = extraCoursesBySect.get(`${dept.name}\0${sect.name}`) || [];
      courses.push(...extraCourses);

      return {
        id: sect.id,
        name: sect.name,
        code: sect.code,
        employeeCount: sect._count.employees + (extraSectCounts.get(sect.id) || 0)
          + extraCourses.reduce((sum, c) => sum + c.employeeCount, 0),
        manager: sect.manager,
        courses,
      };
    });
    // 他組織にのみ存在する部を追加
    const extraSects = extraSectsByDept.get(dept.name) || [];
    sections.push(...extraSects);
    const extraSectsEmployees = extraSects.reduce((sum, s) => sum + s.employeeCount, 0);

    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      employeeCount: dept._count.employees + (extraDeptCounts.get(dept.id) || 0) + extraSectsEmployees,
      manager: dept.manager,
      sections,
    };
  });

  // 他組織にのみ存在する部門を追加
  formattedDepartments.push(...extraDepts);

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
