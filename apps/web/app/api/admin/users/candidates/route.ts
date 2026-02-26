import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users/candidates
 *
 * 社員データからアカウント未作成の候補一覧を取得する。
 *
 * パラメータ:
 * - organizationId (必須) — 組織ID
 * - search — 名前・社員番号・メールで検索
 * - departmentId — 部署フィルター
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId");

    if (!organizationId) {
      return NextResponse.json(
        {
          error: "organizationId is required",
          errorJa: "組織IDは必須です",
        },
        { status: 400 },
      );
    }

    // 対象組織の全アクティブ社員を取得
    // biome-ignore lint: Prisma where clause
    const whereClause: any = {
      organizationId,
      isActive: true,
    };

    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        department: { select: { name: true } },
        section: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    // 全Userのメールアドレスを取得
    const existingUsers = await prisma.user.findMany({
      where: { email: { not: null } },
      select: { email: true },
    });
    const existingEmails = new Set(
      existingUsers.map((u) => u.email?.toLowerCase()).filter(Boolean),
    );

    // PositionMaster を取得し positionCode → level / isManager をマッピング
    const positions = await prisma.positionMaster.findMany({
      where: { isActive: true },
    });
    const positionMap = new Map(
      positions.map((p) => [p.code, { level: p.level, isManager: p.isManager }]),
    );

    // 既にアカウントがある社員を除外し、推定ロールを付与
    let alreadyHasAccount = 0;
    const candidates = [];

    for (const emp of employees) {
      if (emp.email && existingEmails.has(emp.email.toLowerCase())) {
        alreadyHasAccount++;
        continue;
      }

      // 推定ロール判定
      let suggestedRole = "USER";
      const posInfo = emp.positionCode
        ? positionMap.get(emp.positionCode)
        : null;
      if (posInfo) {
        if (posInfo.level === "EXECUTIVE") {
          suggestedRole = "EXECUTIVE";
        } else if (posInfo.isManager) {
          suggestedRole = "MANAGER";
        }
      }

      candidates.push({
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        hasEmail: !!emp.email,
        department: emp.department?.name || "",
        section: emp.section?.name || null,
        position: emp.position,
        suggestedRole,
      });
    }

    return NextResponse.json({
      candidates,
      total: candidates.length,
      alreadyHasAccount,
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch candidates",
        errorJa: "候補の取得に失敗しました",
      },
      { status: 500 },
    );
  }
}
