import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users/retired-accounts
 *
 * 退職者（isActive: false）のうちアカウントが残っているユーザ一覧を取得する。
 *
 * パラメータ:
 * - organizationId (必須) — 組織ID
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  if (!organizationId) {
    throw ApiError.badRequest(
      "organizationId is required",
      "組織IDは必須です",
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
    return { accounts: [], total: 0 };
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

  return {
    accounts,
    total: accounts.length,
  };
}, { admin: true });
