import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const role = (session.user as { role?: Role }).role ?? "USER";
  const id = new URL(request.url).pathname.split("/").at(-2)!;

  const source = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          employee: {
            select: {
              position: true,
              department: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!source) throw ApiError.notFound("Group not found", "グループが見つかりません");

  // 常設グループ（fiscalYear === null）のみ対象
  if (source.fiscalYear !== null) {
    throw ApiError.badRequest(
      "Snapshot is only available for standing groups",
      "スナップショットは常設グループのみ利用できます",
    );
  }

  // 権限チェック: 作成者 or ADMIN
  if (role !== "ADMIN" && source.createdBy !== userId) {
    throw ApiError.forbidden(
      "Only the creator or ADMIN can create snapshots",
      "スナップショットの作成は作成者またはADMINのみ可能です",
    );
  }

  const body = await request.json().catch(() => ({}));

  // デフォルト: 当年度（JST基準）
  let targetYear: number;
  if (typeof body.fiscalYear === "number") {
    targetYear = body.fiscalYear;
  } else {
    const now = new Date();
    const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    targetYear = jst.getMonth() + 1 >= 4 ? jst.getFullYear() : jst.getFullYear() - 1;
  }

  // 同名・同年度のスナップショットが既に存在するかチェック
  const existing = await prisma.group.findFirst({
    where: {
      name: source.name,
      type: "OFFICIAL",
      fiscalYear: targetYear,
      isActive: true,
    },
  });
  if (existing) {
    throw ApiError.badRequest(
      `A snapshot for FY${targetYear} already exists`,
      `${targetYear}年度のスナップショットは既に存在します`,
    );
  }

  const snapshot = await prisma.group.create({
    data: {
      name: source.name,
      description: source.description,
      type: "OFFICIAL",
      createdBy: userId,
      fiscalYear: targetYear,
      archivedAt: new Date(),
      members: {
        create: source.members.map((m) => ({
          employeeId: m.employeeId,
          role: m.role,
          title: m.title,
          snapshotPosition: m.employee.position,
          snapshotDepartment: m.employee.department?.name || null,
          snapshotSection: m.employee.section?.name || null,
        })),
      },
    },
    include: {
      members: {
        include: {
          employee: {
            select: { id: true, name: true, employeeId: true, position: true },
          },
        },
      },
    },
  });

  return { group: snapshot };
}, { successStatus: 201 });
