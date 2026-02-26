import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users/retired-accounts
 *
 * 退職者（isActive: false）のうちアカウントが残っているユーザ一覧を取得する。
 *
 * パラメータ:
 * - organizationId (必須) — 組織ID
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        {
          error: "organizationId is required",
          errorJa: "組織IDは必須です",
        },
        { status: 400 },
      );
    }

    // 退職者（isActive: false）でメールアドレスがある社員を取得
    const retiredEmployees = await prisma.employee.findMany({
      where: {
        organizationId,
        isActive: false,
        email: { not: null },
      },
      include: {
        department: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    if (retiredEmployees.length === 0) {
      return NextResponse.json({ accounts: [], total: 0 });
    }

    // 退職者のメールアドレスで User テーブルを照合
    const retiredEmails = retiredEmployees
      .map((e) => e.email)
      .filter((email): email is string => email !== null);

    const usersWithAccounts = await prisma.user.findMany({
      where: {
        email: { in: retiredEmails },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // メールアドレスでマッピング
    const userByEmail = new Map(
      usersWithAccounts.map((u) => [u.email?.toLowerCase(), u]),
    );

    // アカウントが存在する退職者のみ返す
    const accounts = [];
    for (const emp of retiredEmployees) {
      const user = emp.email
        ? userByEmail.get(emp.email.toLowerCase())
        : null;
      if (!user) continue;

      accounts.push({
        userId: user.id,
        name: user.name || emp.name,
        email: user.email,
        role: user.role,
        department: emp.department?.name || "",
        position: emp.position,
      });
    }

    return NextResponse.json({
      accounts,
      total: accounts.length,
    });
  } catch (error) {
    console.error("Error fetching retired accounts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch retired accounts",
        errorJa: "退職者アカウントの取得に失敗しました",
      },
      { status: 500 },
    );
  }
}
