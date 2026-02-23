import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export { prisma };

// ============================================
// 組織ツリー取得
// ============================================

/**
 * PUBLISHED状態の組織を取得（ReadOnlyのためSCHEDULED自動昇格はしない）
 */
async function getPublishedOrganization() {
  return prisma.organization.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
}

/**
 * 組織階層構造を取得（本部→部→課、責任者・社員数付き）
 */
export async function getOrganizationTree() {
  const organization = await getPublishedOrganization();

  if (!organization) {
    return { organization: null, departments: [] };
  }

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
}

// ============================================
// 社員一覧取得
// ============================================

export interface ListEmployeesParams {
  departmentId?: string;
  sectionId?: string;
  courseId?: string;
  search?: string;
  position?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function listEmployees(params: ListEmployeesParams) {
  const organization = await getPublishedOrganization();

  if (!organization) {
    return { employees: [], total: 0, page: 1, totalPages: 0 };
  }

  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 50, 200);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    organizationId: organization.id,
  };

  // 在籍ステータス（デフォルト: 在籍中のみ）
  if (params.isActive === false) {
    where.isActive = false;
  } else {
    where.isActive = true;
  }

  // 組織フィルタ
  if (params.courseId) {
    where.courseId = params.courseId;
  } else if (params.sectionId) {
    where.sectionId = params.sectionId;
  } else if (params.departmentId) {
    where.departmentId = params.departmentId;
  }

  // 検索フィルタ
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { nameKana: { contains: params.search, mode: "insensitive" } },
      { employeeId: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  // 役職フィルタ
  if (params.position) {
    where.position = params.position;
  }

  const total = await prisma.employee.count({ where });

  // PositionMaster displayOrder でソート
  const positionMasters = await prisma.positionMaster.findMany({
    where: { isActive: true },
    select: { code: true, displayOrder: true },
  });
  const positionOrderMap = new Map<string, number>();
  for (const pm of positionMasters) {
    positionOrderMap.set(pm.code, pm.displayOrder);
  }
  const usePositionMaster = positionMasters.length > 0;

  const allEmployees = await prisma.employee.findMany({
    where,
    include: {
      department: { select: { id: true, name: true, code: true } },
      section: { select: { id: true, name: true, code: true } },
      course: { select: { id: true, name: true, code: true } },
    },
  });

  // カスタムソート
  const sortedEmployees = allEmployees.sort((a, b) => {
    if (usePositionMaster) {
      const orderA =
        a.positionCode != null
          ? (positionOrderMap.get(a.positionCode) ?? 99999)
          : 99999;
      const orderB =
        b.positionCode != null
          ? (positionOrderMap.get(b.positionCode) ?? 99999)
          : 99999;
      if (orderA !== orderB) return orderA - orderB;
    } else {
      const codeA = a.positionCode || "999";
      const codeB = b.positionCode || "999";
      if (codeA === "000" && codeB !== "000") return 1;
      if (codeA !== "000" && codeB === "000") return -1;
      if (codeA !== codeB) return codeA.localeCompare(codeB);
    }
    const nameA = a.nameKana || a.name || "";
    const nameB = b.nameKana || b.name || "";
    return nameA.localeCompare(nameB, "ja");
  });

  const employees = sortedEmployees.slice((page - 1) * limit, page * limit);

  return {
    employees: employees.map((emp) => ({
      id: emp.id,
      employeeId: emp.employeeId,
      name: emp.name,
      nameKana: emp.nameKana,
      email: emp.email,
      phone: emp.phone,
      position: emp.position,
      positionCode: emp.positionCode,
      department: emp.department,
      section: emp.section,
      course: emp.course,
      isActive: emp.isActive,
      joinDate: emp.joinDate,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================
// 社員詳細取得
// ============================================

export async function getEmployee(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
          manager: { select: { id: true, name: true, position: true } },
        },
      },
      section: {
        select: {
          id: true,
          name: true,
          code: true,
          manager: { select: { id: true, name: true, position: true } },
        },
      },
      course: {
        select: {
          id: true,
          name: true,
          code: true,
          manager: { select: { id: true, name: true, position: true } },
        },
      },
    },
  });

  if (!employee) {
    return null;
  }

  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    nameKana: employee.nameKana,
    email: employee.email,
    phone: employee.phone,
    position: employee.position,
    positionCode: employee.positionCode,
    qualificationGrade: employee.qualificationGrade,
    qualificationGradeCode: employee.qualificationGradeCode,
    employmentType: employee.employmentType,
    employmentTypeCode: employee.employmentTypeCode,
    organization: employee.organization,
    department: employee.department,
    section: employee.section,
    course: employee.course,
    joinDate: employee.joinDate,
    birthDate: employee.birthDate,
    isActive: employee.isActive,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

// ============================================
// 社員キーワード検索
// ============================================

export async function searchEmployees(query: string, limit: number = 20) {
  const maxLimit = Math.min(limit, 100);

  const organization = await getPublishedOrganization();

  if (!organization) {
    return [];
  }

  const employees = await prisma.employee.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { nameKana: { contains: query, mode: "insensitive" } },
        { employeeId: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      department: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } },
    },
    take: maxLimit,
    orderBy: [{ name: "asc" }],
  });

  return employees.map((emp) => ({
    id: emp.id,
    employeeId: emp.employeeId,
    name: emp.name,
    nameKana: emp.nameKana,
    email: emp.email,
    position: emp.position,
    department: emp.department,
    section: emp.section,
    course: emp.course,
  }));
}

// ============================================
// 役職マスタ一覧取得
// ============================================

export async function listPositions() {
  const positions = await prisma.positionMaster.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      nameJa: true,
      level: true,
      isManager: true,
      color: true,
      displayOrder: true,
    },
  });

  return positions;
}
