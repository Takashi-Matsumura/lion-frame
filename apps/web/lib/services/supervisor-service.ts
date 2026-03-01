import { prisma } from "@/lib/prisma";

interface Assignment {
  employeeId: string;
  employeeName: string;
  supervisorId: string;
  supervisorName: string;
}

interface Skipped {
  employeeId: string;
  employeeName: string;
  reason: string;
}

interface AutoAssignResult {
  assignments: Assignment[];
  skipped: Skipped[];
}

export class SupervisorService {
  /**
   * 担当役員が設定された本部配下の全社員に supervisorId を自動割り当て
   *
   * ルール:
   * - 本部長 → 担当役員
   * - 部長 → 本部長
   * - 課長 → 部長（部なしなら本部長）
   * - 課所属の一般社員 → 課長（未設定なら部長→本部長へフォールバック）
   * - 部所属の一般社員（課なし） → 部長（未設定なら本部長）
   * - 本部直属の一般社員 → 本部長
   * - 担当役員本人 → スキップ
   * - 自己参照 → スキップ
   */
  static async autoAssignSupervisors(
    departmentId: string,
    executiveId: string,
  ): Promise<AutoAssignResult> {
    // 本部を sections → courses 含めて取得
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        sections: {
          include: {
            courses: true,
          },
        },
      },
    });

    if (!department) {
      return { assignments: [], skipped: [] };
    }

    const departmentManagerId = department.managerId;

    // 組織単位の managerId をマップに格納
    const sectionManagerMap = new Map<string, string | null>();
    const courseManagerMap = new Map<string, string | null>();
    const courseSectionMap = new Map<string, string>(); // courseId → sectionId

    for (const section of department.sections) {
      sectionManagerMap.set(section.id, section.managerId);
      for (const course of section.courses) {
        courseManagerMap.set(course.id, course.managerId);
        courseSectionMap.set(course.id, section.id);
      }
    }

    // 本部配下の全アクティブ社員を取得
    const employees = await prisma.employee.findMany({
      where: {
        departmentId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sectionId: true,
        courseId: true,
      },
    });

    // 責任者ポストに就いている社員IDを特定
    const isDepartmentManager = (id: string) => departmentManagerId === id;
    const isSectionManager = (id: string) => {
      for (const [, managerId] of sectionManagerMap) {
        if (managerId === id) return true;
      }
      return false;
    };
    const isCourseManager = (id: string) => {
      for (const [, managerId] of courseManagerMap) {
        if (managerId === id) return true;
      }
      return false;
    };

    const assignments: Assignment[] = [];
    const skipped: Skipped[] = [];

    // 社員名前マップ（レスポンス用）
    const employeeNameMap = new Map<string, string>();
    for (const emp of employees) {
      employeeNameMap.set(emp.id, emp.name);
    }

    for (const emp of employees) {
      // 担当役員本人はスキップ
      if (emp.id === executiveId) {
        skipped.push({
          employeeId: emp.id,
          employeeName: emp.name,
          reason: "executive_self",
        });
        continue;
      }

      let computedSupervisorId: string | null = null;

      if (isDepartmentManager(emp.id)) {
        // 本部長 → 担当役員
        computedSupervisorId = executiveId;
      } else if (isSectionManager(emp.id)) {
        // 部長 → 本部長
        computedSupervisorId = departmentManagerId;
      } else if (isCourseManager(emp.id)) {
        // 課長 → 部長（部なしなら本部長）
        const sectionId = emp.sectionId;
        if (sectionId) {
          computedSupervisorId =
            sectionManagerMap.get(sectionId) ?? departmentManagerId;
        } else {
          computedSupervisorId = departmentManagerId;
        }
      } else if (emp.courseId) {
        // 課所属の一般社員 → 課長 → 部長 → 本部長
        const courseManagerId = courseManagerMap.get(emp.courseId);
        if (courseManagerId) {
          computedSupervisorId = courseManagerId;
        } else {
          const sectionId = courseSectionMap.get(emp.courseId);
          if (sectionId) {
            computedSupervisorId =
              sectionManagerMap.get(sectionId) ?? departmentManagerId;
          } else {
            computedSupervisorId = departmentManagerId;
          }
        }
      } else if (emp.sectionId) {
        // 部所属の一般社員（課なし） → 部長 → 本部長
        computedSupervisorId =
          sectionManagerMap.get(emp.sectionId) ?? departmentManagerId;
      } else {
        // 本部直属の一般社員 → 本部長
        computedSupervisorId = departmentManagerId;
      }

      // supervisorId が算出できない場合はスキップ
      if (!computedSupervisorId) {
        skipped.push({
          employeeId: emp.id,
          employeeName: emp.name,
          reason: "no_supervisor_found",
        });
        continue;
      }

      // 自己参照防止
      if (computedSupervisorId === emp.id) {
        skipped.push({
          employeeId: emp.id,
          employeeName: emp.name,
          reason: "self_reference",
        });
        continue;
      }

      assignments.push({
        employeeId: emp.id,
        employeeName: emp.name,
        supervisorId: computedSupervisorId,
        supervisorName: employeeNameMap.get(computedSupervisorId) ?? "unknown",
      });
    }

    // バッチ更新: supervisorId ごとにグループ化して updateMany
    if (assignments.length > 0) {
      const groupedBySupervisor = new Map<string, string[]>();
      for (const a of assignments) {
        const group = groupedBySupervisor.get(a.supervisorId) ?? [];
        group.push(a.employeeId);
        groupedBySupervisor.set(a.supervisorId, group);
      }

      await prisma.$transaction(
        Array.from(groupedBySupervisor.entries()).map(
          ([supervisorId, employeeIds]) =>
            prisma.employee.updateMany({
              where: { id: { in: employeeIds } },
              data: { supervisorId },
            }),
        ),
      );
    }

    return { assignments, skipped };
  }
}
