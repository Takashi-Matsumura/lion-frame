import { apiHandler, ApiError } from "@/lib/api";
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/organization/manager-candidates
 *
 * 責任者候補の社員をリストアップ
 *
 * ロジック:
 * - 本部の責任者: 役員 + その本部の本部長/事業部長
 * - 部・課の責任者: その本部に所属する役職持ち（一般ではない）社員
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // department, section, course
  const id = searchParams.get("id");
  const groupMode = searchParams.get("groupMode") === "true";

  if (!type || !id) {
    throw ApiError.badRequest("Type and ID are required");
  }

  // PositionMasterから管理職コードを取得
  const managerPositions = await prisma.positionMaster.findMany({
    where: { isActive: true, isManager: true },
    select: { code: true },
  });
  const managerCodes = new Set(managerPositions.map((p) => p.code));
  const usePositionMaster = managerPositions.length > 0;

  // 本部長クラスを示す役職キーワード（フォールバック）
  const departmentHeadPositions = [
    "本部長",
    "事業部長",
    "副本部長",
    "統括部長",
  ];

  // フォールバック用定数
  const EXPERT_POSITION_CODE = "302";

  // 役職コードが責任者候補として適格かチェック
  const isEligibleForManager = (positionCode: string | null): boolean => {
    if (!positionCode) return false;

    // PositionMasterが設定されている場合はisManagerフラグで判定
    if (usePositionMaster) {
      return managerCodes.has(positionCode);
    }

    // フォールバック: 従来のハードコードロジック
    if (positionCode === "000") return false;
    if (positionCode >= "900") return false;
    return positionCode < EXPERT_POSITION_CODE;
  };

  // 役職コード順（昇順）、同じ役職コードは氏名順でソート
  const sortByPositionCode = (
    a: { positionCode: string | null; name: string },
    b: { positionCode: string | null; name: string },
  ) => {
    const codeA = a.positionCode || "999";
    const codeB = b.positionCode || "999";

    if (codeA !== codeB) {
      return codeA.localeCompare(codeB);
    }

    // 同じ役職コードの場合は氏名でソート
    return a.name.localeCompare(b.name, "ja");
  };

  let candidates: {
    id: string;
    employeeId: string;
    name: string;
    position: string | null;
    positionCode: string | null;
  }[] = [];

  if (type === "department") {
    // 本部の責任者候補: 役員 + その本部の本部長/事業部長

    const department = await prisma.department.findUnique({
      where: { id },
      select: { organizationId: true, name: true },
    });

    if (!department) {
      throw ApiError.notFound("Department not found");
    }

    // 1. 役員・顧問本部から役員を取得
    const executivesDepartment = await prisma.department.findFirst({
      where: {
        organizationId: department.organizationId,
        name: EXECUTIVES_DEPARTMENT_NAME,
      },
    });

    let executives: {
      id: string;
      employeeId: string;
      name: string;
      position: string | null;
      positionCode: string | null;
    }[] = [];
    if (executivesDepartment) {
      executives = await prisma.employee.findMany({
        where: {
          departmentId: executivesDepartment.id,
          isActive: true,
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          position: true,
          positionCode: true,
        },
      });
    }

    // 2. その本部の本部長/事業部長を取得
    const departmentHeads = await prisma.employee.findMany({
      where: {
        departmentId: id,
        isActive: true,
        OR: departmentHeadPositions.map((pos) => ({
          position: { contains: pos },
        })),
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        position: true,
        positionCode: true,
      },
    });

    // 重複を除去してマージ
    const candidateMap = new Map();
    for (const emp of executives) {
      if (isEligibleForManager(emp.positionCode)) {
        candidateMap.set(emp.id, emp);
      }
    }
    for (const emp of departmentHeads) {
      if (isEligibleForManager(emp.positionCode)) {
        candidateMap.set(emp.id, emp);
      }
    }
    candidates = Array.from(candidateMap.values()).sort(sortByPositionCode);
  } else if (type === "section") {
    // 部の責任者候補: その本部に所属する役職持ち（一般ではない）社員

    const section = await prisma.section.findUnique({
      where: { id },
      select: { departmentId: true },
    });

    if (!section) {
      throw ApiError.notFound("Section not found");
    }

    const sectionCandidates = await prisma.employee.findMany({
      where: {
        departmentId: section.departmentId,
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        position: true,
        positionCode: true,
      },
    });
    // 役職コードでフィルター（エキスパート未満のみ）してソート
    candidates = sectionCandidates
      .filter((emp) => isEligibleForManager(emp.positionCode))
      .sort(sortByPositionCode);
  } else if (type === "course") {
    // 課の責任者候補: その本部に所属する役職持ち（一般ではない）社員

    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        section: {
          select: { departmentId: true },
        },
      },
    });

    if (!course) {
      throw ApiError.notFound("Course not found");
    }

    const courseCandidates = await prisma.employee.findMany({
      where: {
        departmentId: course.section.departmentId,
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        position: true,
        positionCode: true,
      },
    });
    // 役職コードでフィルター（エキスパート未満のみ）してソート
    candidates = courseCandidates
      .filter((emp) => isEligibleForManager(emp.positionCode))
      .sort(sortByPositionCode);
  }

  // グループモード: 全PUBLISHED組織の同名ユニットから候補を収集
  if (groupMode) {
    // 対象ユニットの名前・階層パスを取得
    let unitName = "";
    let deptName = "";
    let sectName = "";

    if (type === "department") {
      const dept = await prisma.department.findUnique({
        where: { id },
        select: { name: true },
      });
      if (dept) unitName = dept.name;
      deptName = unitName;
    } else if (type === "section") {
      const sect = await prisma.section.findUnique({
        where: { id },
        select: { name: true, department: { select: { name: true } } },
      });
      if (sect) {
        unitName = sect.name;
        deptName = sect.department.name;
      }
    } else if (type === "course") {
      const course = await prisma.course.findUnique({
        where: { id },
        select: {
          name: true,
          section: {
            select: {
              name: true,
              department: { select: { name: true } },
            },
          },
        },
      });
      if (course) {
        unitName = course.name;
        sectName = course.section.name;
        deptName = course.section.department.name;
      }
    }

    // 全PUBLISHED組織から同名の親本部（deptName）のdepartmentIdを収集
    // section/courseの場合も、同名の親本部全体から候補を集める
    const publishedOrgs = await prisma.organization.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, name: true },
    });

    const departmentIds = new Set<string>();

    for (const org of publishedOrgs) {
      // 全タイプ共通: 同名の本部(deptName)のIDを収集
      const matchingDepts = await prisma.department.findMany({
        where: { organizationId: org.id, name: deptName },
        select: { id: true },
      });
      for (const d of matchingDepts) departmentIds.add(d.id);
    }

    // 各部署から候補を収集
    const allCandidates = await prisma.employee.findMany({
      where: {
        departmentId: { in: Array.from(departmentIds) },
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        position: true,
        positionCode: true,
        department: {
          select: {
            organization: { select: { name: true } },
          },
        },
      },
    });

    // 本部の場合は役員も追加
    if (type === "department") {
      for (const org of publishedOrgs) {
        const execDept = await prisma.department.findFirst({
          where: { organizationId: org.id, name: EXECUTIVES_DEPARTMENT_NAME },
        });
        if (execDept) {
          const execs = await prisma.employee.findMany({
            where: { departmentId: execDept.id, isActive: true },
            select: {
              id: true,
              employeeId: true,
              name: true,
              position: true,
              positionCode: true,
              department: {
                select: {
                  organization: { select: { name: true } },
                },
              },
            },
          });
          allCandidates.push(...execs);
        }
      }
    }

    // フィルター + 重複排除
    const candidateMap = new Map<string, typeof candidates[number] & { orgName?: string }>();
    for (const emp of allCandidates) {
      if (isEligibleForManager(emp.positionCode) && !candidateMap.has(emp.id)) {
        candidateMap.set(emp.id, {
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.name,
          position: emp.position,
          positionCode: emp.positionCode,
          orgName: emp.department?.organization?.name || "",
        });
      }
    }

    candidates = Array.from(candidateMap.values()).sort(sortByPositionCode);
  }

  return { candidates };
}, { admin: true });
