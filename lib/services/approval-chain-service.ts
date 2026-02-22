import { prisma } from "@/lib/prisma";

type EmployeeSummary = {
  id: string;
  employeeId: string;
  name: string;
  position: string;
};

type UnitInfo = {
  type: "course" | "section" | "department";
  id: string;
  name: string;
};

export type ApprovalChainEntry = {
  level: number;
  role: "courseManager" | "sectionManager" | "departmentManager";
  employee: EmployeeSummary;
  unit: UnitInfo;
};

export type ApprovalChainResult = {
  employee: {
    id: string;
    employeeId: string;
    name: string;
    position: string;
    department: { id: string; name: string } | null;
    section: { id: string; name: string } | null;
    course: { id: string; name: string } | null;
  };
  directSupervisor: (EmployeeSummary & { unitType: string; unitName: string }) | null;
  approvalChain: ApprovalChainEntry[];
  isTopLevel: boolean;
};

export type SubordinatesResult = {
  manager: EmployeeSummary;
  managedUnits: {
    departments: { id: string; name: string }[];
    sections: { id: string; name: string }[];
    courses: { id: string; name: string }[];
  };
  subordinates: (EmployeeSummary & {
    department: { id: string; name: string } | null;
    section: { id: string; name: string } | null;
    course: { id: string; name: string } | null;
  })[];
};

/**
 * 社員の承認チェーン（上方向）を解決する
 *
 * 所属階層を下から上へ走査し、各階層のmanagerをチェーンに追加する。
 * 自分自身がmanagerの階層はスキップし、重複も排除する。
 */
export async function resolveApprovalChain(
  employeeId: string,
): Promise<ApprovalChainResult | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          manager: {
            select: { id: true, employeeId: true, name: true, position: true },
          },
        },
      },
      section: {
        select: {
          id: true,
          name: true,
          manager: {
            select: { id: true, employeeId: true, name: true, position: true },
          },
        },
      },
      course: {
        select: {
          id: true,
          name: true,
          manager: {
            select: { id: true, employeeId: true, name: true, position: true },
          },
        },
      },
    },
  });

  if (!employee) return null;

  const chain: ApprovalChainEntry[] = [];
  const seenIds = new Set<string>();

  // Course → Section → Department の順に走査
  if (employee.course?.manager && employee.course.manager.id !== employeeId) {
    chain.push({
      level: chain.length + 1,
      role: "courseManager",
      employee: employee.course.manager,
      unit: { type: "course", id: employee.course.id, name: employee.course.name },
    });
    seenIds.add(employee.course.manager.id);
  }

  if (
    employee.section?.manager &&
    employee.section.manager.id !== employeeId &&
    !seenIds.has(employee.section.manager.id)
  ) {
    chain.push({
      level: chain.length + 1,
      role: "sectionManager",
      employee: employee.section.manager,
      unit: { type: "section", id: employee.section.id, name: employee.section.name },
    });
    seenIds.add(employee.section.manager.id);
  }

  if (
    employee.department?.manager &&
    employee.department.manager.id !== employeeId &&
    !seenIds.has(employee.department.manager.id)
  ) {
    chain.push({
      level: chain.length + 1,
      role: "departmentManager",
      employee: employee.department.manager,
      unit: {
        type: "department",
        id: employee.department.id,
        name: employee.department.name,
      },
    });
  }

  const directSupervisor = chain.length > 0
    ? {
        ...chain[0].employee,
        unitType: chain[0].unit.type,
        unitName: chain[0].unit.name,
      }
    : null;

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      position: employee.position,
      department: employee.department
        ? { id: employee.department.id, name: employee.department.name }
        : null,
      section: employee.section
        ? { id: employee.section.id, name: employee.section.name }
        : null,
      course: employee.course
        ? { id: employee.course.id, name: employee.course.name }
        : null,
    },
    directSupervisor,
    approvalChain: chain,
    isTopLevel: chain.length === 0,
  };
}

/**
 * マネージャーの配下社員（下方向）を解決する
 *
 * managedDepartments/Sections/Coursesから配下の全社員を取得する。
 */
export async function resolveSubordinates(
  employeeId: string,
): Promise<SubordinatesResult | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      managedDepartments: { select: { id: true, name: true } },
      managedSections: { select: { id: true, name: true } },
      managedCourses: { select: { id: true, name: true } },
    },
  });

  if (!employee) return null;

  const deptIds = employee.managedDepartments.map((d) => d.id);
  const secIds = employee.managedSections.map((s) => s.id);
  const courseIds = employee.managedCourses.map((c) => c.id);

  // 管理ユニットがない場合は空の結果を返す
  if (deptIds.length === 0 && secIds.length === 0 && courseIds.length === 0) {
    return {
      manager: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        position: employee.position,
      },
      managedUnits: {
        departments: employee.managedDepartments,
        sections: employee.managedSections,
        courses: employee.managedCourses,
      },
      subordinates: [],
    };
  }

  // OR条件で全配下社員を1クエリで取得
  const orConditions: Record<string, unknown>[] = [];
  if (deptIds.length > 0) orConditions.push({ departmentId: { in: deptIds } });
  if (secIds.length > 0) orConditions.push({ sectionId: { in: secIds } });
  if (courseIds.length > 0) orConditions.push({ courseId: { in: courseIds } });

  const subordinates = await prisma.employee.findMany({
    where: {
      OR: orConditions,
      isActive: true,
      id: { not: employeeId }, // 自分自身を除外
    },
    select: {
      id: true,
      employeeId: true,
      name: true,
      position: true,
      department: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } },
    },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });

  // 重複排除
  const seen = new Set<string>();
  const unique = subordinates.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return {
    manager: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      position: employee.position,
    },
    managedUnits: {
      departments: employee.managedDepartments,
      sections: employee.managedSections,
      courses: employee.managedCourses,
    },
    subordinates: unique,
  };
}
