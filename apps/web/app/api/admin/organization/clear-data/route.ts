import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/organization/clear-data
 *
 * DRAFT組織のインポートデータを全削除（社員・部署構造・履歴）
 * 組織レコード自体は残す
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // 組織を取得してDRAFTか確認
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    if (org.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT organizations can be cleared" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. 責任者参照をクリア（外部キー制約回避）
      await tx.department.updateMany({
        where: { organizationId },
        data: { managerId: null },
      });
      await tx.section.updateMany({
        where: { department: { organizationId } },
        data: { managerId: null },
      });
      await tx.course.updateMany({
        where: { section: { department: { organizationId } } },
        data: { managerId: null },
      });

      // 2. 社員の履歴を削除（Cascade で自動削除されるが明示的に）
      const employeeHistoryCount = await tx.employeeHistory.deleteMany({
        where: { organizationId },
      });

      // 3. 社員を削除
      const employeeCount = await tx.employee.deleteMany({
        where: { organizationId },
      });

      // 4. 課を削除
      const courseCount = await tx.course.deleteMany({
        where: { section: { department: { organizationId } } },
      });

      // 5. 部を削除
      const sectionCount = await tx.section.deleteMany({
        where: { department: { organizationId } },
      });

      // 6. 本部を削除
      const departmentCount = await tx.department.deleteMany({
        where: { organizationId },
      });

      // 7. 組織履歴を削除
      const orgHistoryCount = await tx.organizationHistory.deleteMany({
        where: { organizationId },
      });

      // 8. 変更ログを削除（この組織に関連するもの）
      const changeLogCount = await tx.changeLog.deleteMany({
        where: {
          entityType: { in: ["employee", "department", "section", "course"] },
          entityId: {
            in: [organizationId],
          },
        },
      });

      // 9. pendingSnapshotAfterImport をクリア
      const pendingSetting = await tx.systemSetting.findUnique({
        where: { key: "pendingSnapshotAfterImport" },
      });
      if (pendingSetting) {
        await tx.systemSetting.update({
          where: { key: "pendingSnapshotAfterImport" },
          data: {
            value: JSON.stringify({
              pending: false,
              clearedAt: new Date().toISOString(),
              clearedBy: session.user?.id || "admin",
            }),
          },
        });
      }

      return {
        employees: employeeCount.count,
        employeeHistories: employeeHistoryCount.count,
        courses: courseCount.count,
        sections: sectionCount.count,
        departments: departmentCount.count,
        organizationHistories: orgHistoryCount.count,
        changeLogs: changeLogCount.count,
      };
    });

    return NextResponse.json({
      success: true,
      deleted: result,
    });
  } catch (error) {
    console.error("Error clearing organization data:", error);
    return NextResponse.json(
      { error: "Failed to clear organization data" },
      { status: 500 },
    );
  }
}
