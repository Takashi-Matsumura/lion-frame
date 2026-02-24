import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

interface Assignment {
  type: "department" | "section" | "course";
  unitId: string;
  unitName: string;
  managerId: string;
  managerName: string;
  managerPosition: string;
  positionLevel: string;
}

interface Skipped {
  type: string;
  unitId: string;
  unitName: string;
  reason: "already_assigned" | "no_candidates";
}

/**
 * POST /api/admin/organization/auto-assign-managers
 *
 * 役職マスタに基づいて責任者を自動割当
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // PositionMasterから管理職を取得
    const managerPositions = await prisma.positionMaster.findMany({
      where: { isActive: true, isManager: true },
      orderBy: { displayOrder: "asc" },
    });

    if (managerPositions.length === 0) {
      return NextResponse.json(
        { error: "no_position_master" },
        { status: 400 },
      );
    }

    // レベル別に管理職コードをマッピング
    const managerCodesByLevel: Record<string, Set<string>> = {};
    const positionInfoByCode: Record<
      string,
      { displayOrder: number; level: string; name: string; nameJa: string }
    > = {};

    for (const pos of managerPositions) {
      if (!managerCodesByLevel[pos.level]) {
        managerCodesByLevel[pos.level] = new Set();
      }
      managerCodesByLevel[pos.level].add(pos.code);
      positionInfoByCode[pos.code] = {
        displayOrder: pos.displayOrder,
        level: pos.level,
        name: pos.name,
        nameJa: pos.nameJa,
      };
    }

    // 本部候補レベル: EXECUTIVE + DEPARTMENT
    const deptCandidateCodes = new Set<string>([
      ...(managerCodesByLevel["EXECUTIVE"] || []),
      ...(managerCodesByLevel["DEPARTMENT"] || []),
    ]);

    // 部候補レベル: SECTION
    const sectionCandidateCodes = managerCodesByLevel["SECTION"] || new Set();

    // 課候補レベル: COURSE
    const courseCandidateCodes = managerCodesByLevel["COURSE"] || new Set();

    // 組織ツリーを取得
    const departments = await prisma.department.findMany({
      where: { organizationId },
      include: {
        manager: { select: { id: true } },
        sections: {
          include: {
            manager: { select: { id: true } },
            courses: {
              include: {
                manager: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    // 全社員を取得（organizationに所属するアクティブ社員）
    const allEmployees = await prisma.employee.findMany({
      where: {
        department: { organizationId },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        position: true,
        positionCode: true,
        departmentId: true,
        sectionId: true,
        courseId: true,
      },
    });

    // 社員をdepartmentId, sectionId, courseIdでインデックス
    const empsByDept: Record<string, typeof allEmployees> = {};
    const empsBySect: Record<string, typeof allEmployees> = {};
    const empsByCourse: Record<string, typeof allEmployees> = {};

    for (const emp of allEmployees) {
      if (emp.departmentId) {
        (empsByDept[emp.departmentId] ||= []).push(emp);
      }
      if (emp.sectionId) {
        (empsBySect[emp.sectionId] ||= []).push(emp);
      }
      if (emp.courseId) {
        (empsByCourse[emp.courseId] ||= []).push(emp);
      }
    }

    // 最適な候補を選択する関数
    const selectBestCandidate = (
      employees: typeof allEmployees,
      candidateCodes: Set<string>,
    ) => {
      const candidates = employees.filter(
        (emp) => emp.positionCode && candidateCodes.has(emp.positionCode),
      );

      if (candidates.length === 0) return null;

      // displayOrder最小 → positionCode昇順で選択
      candidates.sort((a, b) => {
        const orderA =
          positionInfoByCode[a.positionCode!]?.displayOrder ?? 9999;
        const orderB =
          positionInfoByCode[b.positionCode!]?.displayOrder ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.positionCode || "").localeCompare(b.positionCode || "");
      });

      return candidates[0];
    };

    const assignments: Assignment[] = [];
    const skipped: Skipped[] = [];

    // 本部の責任者割当
    for (const dept of departments) {
      // 役員・顧問本部はスキップ
      if (dept.name === EXECUTIVES_DEPARTMENT_NAME) continue;

      if (dept.manager) {
        skipped.push({
          type: "department",
          unitId: dept.id,
          unitName: dept.name,
          reason: "already_assigned",
        });
      } else {
        // 本部に所属する全社員（sectionId=null含む）から候補選定
        const deptEmployees = empsByDept[dept.id] || [];
        const candidate = selectBestCandidate(deptEmployees, deptCandidateCodes);

        if (candidate) {
          await prisma.department.update({
            where: { id: dept.id },
            data: { managerId: candidate.id },
          });
          assignments.push({
            type: "department",
            unitId: dept.id,
            unitName: dept.name,
            managerId: candidate.id,
            managerName: candidate.name,
            managerPosition: candidate.position || "",
            positionLevel:
              positionInfoByCode[candidate.positionCode!]?.level || "",
          });
        } else {
          skipped.push({
            type: "department",
            unitId: dept.id,
            unitName: dept.name,
            reason: "no_candidates",
          });
        }
      }

      // 部の責任者割当
      for (const sect of dept.sections) {
        if (sect.manager) {
          skipped.push({
            type: "section",
            unitId: sect.id,
            unitName: sect.name,
            reason: "already_assigned",
          });
        } else {
          const sectEmployees = empsBySect[sect.id] || [];
          const candidate = selectBestCandidate(
            sectEmployees,
            sectionCandidateCodes,
          );

          if (candidate) {
            await prisma.section.update({
              where: { id: sect.id },
              data: { managerId: candidate.id },
            });
            assignments.push({
              type: "section",
              unitId: sect.id,
              unitName: sect.name,
              managerId: candidate.id,
              managerName: candidate.name,
              managerPosition: candidate.position || "",
              positionLevel:
                positionInfoByCode[candidate.positionCode!]?.level || "",
            });
          } else {
            skipped.push({
              type: "section",
              unitId: sect.id,
              unitName: sect.name,
              reason: "no_candidates",
            });
          }
        }

        // 課の責任者割当
        for (const course of sect.courses) {
          if (course.manager) {
            skipped.push({
              type: "course",
              unitId: course.id,
              unitName: course.name,
              reason: "already_assigned",
            });
          } else {
            const courseEmployees = empsByCourse[course.id] || [];
            const candidate = selectBestCandidate(
              courseEmployees,
              courseCandidateCodes,
            );

            if (candidate) {
              await prisma.course.update({
                where: { id: course.id },
                data: { managerId: candidate.id },
              });
              assignments.push({
                type: "course",
                unitId: course.id,
                unitName: course.name,
                managerId: candidate.id,
                managerName: candidate.name,
                managerPosition: candidate.position || "",
                positionLevel:
                  positionInfoByCode[candidate.positionCode!]?.level || "",
              });
            } else {
              skipped.push({
                type: "course",
                unitId: course.id,
                unitName: course.name,
                reason: "no_candidates",
              });
            }
          }
        }
      }
    }

    await AuditService.log({
      action: "MANAGER_AUTO_ASSIGN",
      category: "SYSTEM_SETTING",
      userId: session.user?.id,
      targetId: organizationId,
      targetType: "Organization",
      details: {
        assignmentsCount: assignments.length,
        skippedCount: skipped.length,
      },
    });

    return NextResponse.json({ assignments, skipped });
  } catch (error) {
    console.error("Error auto-assigning managers:", error);
    return NextResponse.json(
      { error: "Failed to auto-assign managers" },
      { status: 500 },
    );
  }
}
