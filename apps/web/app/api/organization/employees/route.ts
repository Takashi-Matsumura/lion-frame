import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/employees
 *
 * 社員一覧を取得（フィルター・ページネーション対応）
 *
 * 複数のPUBLISHED組織がある場合、全組織の社員を統合して返す。
 * 他組織の社員の department/section/course はプライマリ組織の
 * IDにリマップされる（名前マッチング）。
 *
 * クエリパラメータ:
 * - organizationId: 指定時はその組織のみ（管理画面用、統合しない）
 * - departmentId: 本部ID
 * - sectionId: 部ID
 * - courseId: 課ID
 * - search: 名前・社員番号検索
 * - position: 役職フィルター
 * - isActive: 在籍ステータス（true/false）
 * - exclusiveMode: 重複しない表示モード（true: 各階層に直接所属する社員のみ表示）
 * - page: ページ番号（デフォルト: 1）
 * - limit: 1ページあたりの件数（デフォルト: 50）
 * - referenceDate: 基準日（YYYY-MM-DD）
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("departmentId");
  const sectionId = searchParams.get("sectionId");
  const courseId = searchParams.get("courseId");
  const search = searchParams.get("search");
  const position = searchParams.get("position");
  const isActiveParam = searchParams.get("isActive");
  const exclusiveMode = searchParams.get("exclusiveMode") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const referenceDateStr = searchParams.get("referenceDate");
  const organizationId = searchParams.get("organizationId");

  // 基準日が今日かどうかを判定（JST基準）
  const todayJSTStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const isToday = !referenceDateStr || referenceDateStr === todayJSTStr;

  // === 組織の取得 ===
  let primaryOrg: { id: string; name: string } | null = null;
  let allOrgIds: string[] = [];

  if (organizationId) {
    // 指定IDの組織を直接取得（統合しない）
    primaryOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (primaryOrg) allOrgIds = [primaryOrg.id];
  } else {
    // 全PUBLISHED組織を取得（古い順 = プライマリが最初）
    const publishedOrgs = await prisma.organization.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "asc" },
      select: { id: true, name: true },
    });

    if (publishedOrgs.length === 0) {
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
        publishedOrgs.push({ id: promoted.id, name: promoted.name });
      }
    }

    primaryOrg = publishedOrgs[0] ?? null;
    allOrgIds = publishedOrgs.map((o) => o.id);
  }

  if (!primaryOrg) {
    return {
      employees: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
  }

  const otherOrgIds = allOrgIds.filter((id) => id !== primaryOrg!.id);

  // === 基準日モード: EmployeeHistory からスナップショットを復元 ===
  if (!isToday && referenceDateStr) {
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

    // 退職日による在籍判定
    let filteredHistories = histories.filter((h) => {
      if (!h.retirementDate) return true;
      return h.retirementDate >= refDateStartJST;
    });

    // isActive フィルター
    if (isActiveParam === "false") {
      filteredHistories = filteredHistories.filter((h) => !h.isActive);
    } else if (isActiveParam !== "all") {
      filteredHistories = filteredHistories.filter((h) => h.isActive);
    }

    // 検索フィルター
    if (search) {
      const q = search.toLowerCase();
      filteredHistories = filteredHistories.filter((h) =>
        h.name.toLowerCase().includes(q) ||
        (h.nameKana && h.nameKana.toLowerCase().includes(q)) ||
        h.email.toLowerCase().includes(q),
      );
    }

    // 役職フィルター
    if (position) {
      filteredHistories = filteredHistories.filter((h) => h.position === position);
    }

    // プライマリ組織のIDマップを構築（正規化用）
    let deptNameToId: Map<string, string> | null = null;
    let sectKeyToId: Map<string, string> | null = null;
    let courseKeyToId: Map<string, string> | null = null;

    if (otherOrgIds.length > 0) {
      const primaryDepts = await prisma.department.findMany({
        where: { organizationId: primaryOrg.id },
        include: { sections: { include: { courses: true } } },
      });

      deptNameToId = new Map();
      sectKeyToId = new Map();
      courseKeyToId = new Map();

      for (const dept of primaryDepts) {
        deptNameToId.set(dept.name, dept.id);
        for (const sect of dept.sections) {
          sectKeyToId.set(`${dept.name}\0${sect.name}`, sect.id);
          for (const course of sect.courses) {
            courseKeyToId.set(`${dept.name}\0${sect.name}\0${course.name}`, course.id);
          }
        }
      }
    }

    // PositionMasterでソート
    const positionMasters = await prisma.positionMaster.findMany({
      where: { isActive: true },
      select: { code: true, displayOrder: true, color: true },
    });
    const positionOrderMap = new Map<string, number>();
    const positionColorMap = new Map<string, string | null>();
    for (const pm of positionMasters) {
      positionOrderMap.set(pm.code, pm.displayOrder);
      positionColorMap.set(pm.code, pm.color);
    }

    const sorted = filteredHistories.sort((a, b) => {
      const orderA = a.positionCode != null ? (positionOrderMap.get(a.positionCode) ?? 99999) : 99999;
      const orderB = b.positionCode != null ? (positionOrderMap.get(b.positionCode) ?? 99999) : 99999;
      if (orderA !== orderB) return orderA - orderB;
      const nameA = a.nameKana || a.name || "";
      const nameB = b.nameKana || b.name || "";
      return nameA.localeCompare(nameB, "ja");
    });

    const total = sorted.length;
    const paged = sorted.slice((page - 1) * limit, page * limit);

    // 役職リスト
    const posSet = new Set<string>();
    for (const h of filteredHistories) posSet.add(h.position);

    return {
      employees: paged.map((h) => {
        // 他組織の社員はプライマリのIDにリマップ
        const isOtherOrg = h.organizationId !== primaryOrg!.id;
        const canonDeptId = isOtherOrg && deptNameToId
          ? (deptNameToId.get(h.departmentName) || h.departmentId)
          : h.departmentId;
        const canonSectId = isOtherOrg && sectKeyToId && h.sectionName
          ? (sectKeyToId.get(`${h.departmentName}\0${h.sectionName}`) || h.sectionId)
          : h.sectionId;
        const canonCourseId = isOtherOrg && courseKeyToId && h.sectionName && h.courseName
          ? (courseKeyToId.get(`${h.departmentName}\0${h.sectionName}\0${h.courseName}`) || h.courseId)
          : h.courseId;

        return {
          id: h.employeeId,
          employeeId: h.employeeId,
          name: h.name,
          nameKana: h.nameKana,
          email: h.email,
          phone: h.phone,
          position: h.position,
          positionCode: h.positionCode,
          positionColor: h.positionCode != null ? (positionColorMap.get(h.positionCode) ?? null) : null,
          department: canonDeptId ? { id: canonDeptId, name: h.departmentName } : null,
          section: canonSectId ? { id: canonSectId, name: h.sectionName || "" } : null,
          course: canonCourseId ? { id: canonCourseId, name: h.courseName || "" } : null,
          isActive: h.isActive,
          joinDate: h.joinDate,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      positions: Array.from(posSet),
      referenceDate: referenceDateStr,
    };
  }

  // === 通常モード（今日の組織） ===

  // 他組織の社員IDリマップ用マッピング構築
  type UnitInfo = { id: string; name: string; code: string | null };
  let deptNameMap: Map<string, UnitInfo> | null = null;
  let sectKeyMap: Map<string, UnitInfo> | null = null;
  let courseKeyMap: Map<string, UnitInfo> | null = null;

  if (otherOrgIds.length > 0) {
    const primaryDeptTree = await prisma.department.findMany({
      where: { organizationId: primaryOrg.id },
      select: {
        id: true, name: true, code: true,
        sections: {
          select: {
            id: true, name: true, code: true,
            courses: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    deptNameMap = new Map();
    sectKeyMap = new Map();
    courseKeyMap = new Map();

    for (const dept of primaryDeptTree) {
      deptNameMap.set(dept.name, { id: dept.id, name: dept.name, code: dept.code });
      for (const sect of dept.sections) {
        sectKeyMap.set(`${dept.name}\0${sect.name}`, { id: sect.id, name: sect.name, code: sect.code });
        for (const course of sect.courses) {
          courseKeyMap.set(`${dept.name}\0${sect.name}\0${course.name}`, { id: course.id, name: course.name, code: course.code });
        }
      }
    }
  }

  // フィルター条件を構築（全組織を対象）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    organizationId: { in: allOrgIds },
  };

  // 在籍ステータスフィルター（デフォルトは在籍中のみ）
  if (isActiveParam === "false") {
    where.isActive = false;
  } else if (isActiveParam === "all") {
    // 全て表示（条件なし）
  } else {
    where.isActive = true;
  }

  // 組織階層フィルター
  if (courseId) {
    where.courseId = courseId;
  } else if (sectionId) {
    where.sectionId = sectionId;
    if (exclusiveMode) {
      where.courseId = null;
    }
  } else if (departmentId) {
    where.departmentId = departmentId;
    if (exclusiveMode) {
      where.sectionId = null;
    }
  }

  // 検索フィルター（名前・社員番号・メール）
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nameKana: { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // 役職フィルター
  if (position) {
    where.position = position;
  }

  // 独立したクエリを並列実行（async-parallel）
  const [total, positionMasters, allEmployees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.positionMaster.findMany({
      where: { isActive: true },
      select: { code: true, displayOrder: true, color: true },
    }),
    prisma.employee.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        section: {
          select: { id: true, name: true, code: true },
        },
        course: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
  ]);

  const positionOrderMap = new Map<string, number>();
  const positionColorMap = new Map<string, string | null>();
  for (const pm of positionMasters) {
    positionOrderMap.set(pm.code, pm.displayOrder);
    positionColorMap.set(pm.code, pm.color);
  }
  const usePositionMaster = positionMasters.length > 0;

  // カスタムソート: PositionMaster.displayOrder → 役職コード順（「000」は最後）→ 名前の五十音順
  const sortedEmployees = allEmployees.sort((a, b) => {
    if (usePositionMaster) {
      const orderA = a.positionCode != null ? (positionOrderMap.get(a.positionCode) ?? 99999) : 99999;
      const orderB = b.positionCode != null ? (positionOrderMap.get(b.positionCode) ?? 99999) : 99999;
      if (orderA !== orderB) return orderA - orderB;
    } else {
      const codeA = a.positionCode || "999";
      const codeB = b.positionCode || "999";

      const isGeneralA = codeA === "000";
      const isGeneralB = codeB === "000";

      if (isGeneralA && !isGeneralB) return 1;
      if (!isGeneralA && isGeneralB) return -1;

      if (codeA !== codeB) {
        return codeA.localeCompare(codeB);
      }
    }

    // 同じ表示順の場合は名前カナ（五十音順）でソート
    const nameA = a.nameKana || a.name || "";
    const nameB = b.nameKana || b.name || "";
    return nameA.localeCompare(nameB, "ja");
  });

  // ページネーション適用
  const employees = sortedEmployees.slice((page - 1) * limit, page * limit);

  // 役職リストを取得（全組織から）
  const positionsData = await prisma.employee.findMany({
    where: {
      organizationId: { in: allOrgIds },
      isActive: true,
    },
    select: { position: true, positionCode: true },
    distinct: ["position"],
  });

  // 役職リストをソート
  const sortedPositions = positionsData.sort((a, b) => {
    if (usePositionMaster) {
      const orderA = a.positionCode != null ? (positionOrderMap.get(a.positionCode) ?? 99999) : 99999;
      const orderB = b.positionCode != null ? (positionOrderMap.get(b.positionCode) ?? 99999) : 99999;
      return orderA - orderB;
    }
    const codeA = a.positionCode || "999";
    const codeB = b.positionCode || "999";
    if (codeA === "000" && codeB !== "000") return 1;
    if (codeA !== "000" && codeB === "000") return -1;
    return codeA.localeCompare(codeB);
  });

  return {
    employees: employees.map((emp) => {
      // 他組織の社員はプライマリのIDにリマップ
      let dept = emp.department;
      let sect = emp.section;
      let crs = emp.course;

      if (deptNameMap && emp.organizationId !== primaryOrg!.id) {
        const deptName = emp.department?.name;
        if (deptName) {
          dept = deptNameMap.get(deptName) ?? emp.department;

          const sectName = emp.section?.name;
          if (sectName && sectKeyMap) {
            sect = sectKeyMap.get(`${deptName}\0${sectName}`) ?? emp.section;

            const courseName = emp.course?.name;
            if (courseName && courseKeyMap) {
              crs = courseKeyMap.get(`${deptName}\0${sectName}\0${courseName}`) ?? emp.course;
            }
          }
        }
      }

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        nameKana: emp.nameKana,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        positionCode: emp.positionCode,
        positionColor: emp.positionCode != null ? (positionColorMap.get(emp.positionCode) ?? null) : null,
        department: dept,
        section: sect,
        course: crs,
        isActive: emp.isActive,
        joinDate: emp.joinDate,
      };
    }),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    positions: sortedPositions.map((p) => p.position),
  };
});
