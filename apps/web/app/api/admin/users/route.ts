import type { Role } from "@prisma/client";
import { ApiError, apiHandler, parsePagination } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users
 *
 * ユーザ一覧を取得（ページネーション、検索、フィルター、ソート対応）
 *
 * Query Parameters:
 * - page: ページ番号（デフォルト: 1）
 * - pageSize: 1ページあたりの件数（デフォルト: 20）
 * - search: 検索クエリ（名前またはメール）
 * - role: ロールフィルター（ADMIN, MANAGER, USER, GUEST）
 * - sortBy: ソート対象カラム（name, email, role, createdAt）（デフォルト: createdAt）
 * - sortOrder: ソート順序（asc, desc）（デフォルト: desc）
 *
 * Response:
 * {
 *   users: Array<User>;
 *   total: number;
 *   page: number;
 *   totalPages: number;
 *   pageSize: number;
 * }
 */
export const GET = apiHandler(async (request) => {
  const { page, pageSize, skip } = parsePagination(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const role = url.searchParams.get("role") as Role | null;
  const passwordStatus = url.searchParams.get("passwordStatus") || "";
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";

  // ソートパラメータのバリデーション
  const validSortFields = ["name", "email", "role", "createdAt"];
  const validSortOrders = ["asc", "desc"];
  if (
    !validSortFields.includes(sortBy) ||
    !validSortOrders.includes(sortOrder)
  ) {
    throw ApiError.badRequest("Invalid sort parameters");
  }

  // フィルター条件を構築
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: Array<Record<string, any>> = [];

  // 検索条件
  if (search) {
    conditions.push({
      OR: [{ name: { contains: search } }, { email: { contains: search } }],
    });
  }

  // ロールフィルター
  if (role && ["ADMIN", "EXECUTIVE", "MANAGER", "USER", "GUEST"].includes(role)) {
    conditions.push({ role });
  }

  // パスワードステータスフィルター
  if (passwordStatus === "tempPassword") {
    conditions.push({ forcePasswordChange: true });
  } else if (passwordStatus === "expired") {
    conditions.push({
      forcePasswordChange: true,
      passwordExpiresAt: { lt: new Date() },
    });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  // 総件数を取得
  const total = await prisma.user.count({ where });

  // ページネーション付きでユーザを取得（組織データも含める）
  const users = await prisma.user.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: pageSize,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      lastSignInAt: true,
      forcePasswordChange: true,
      passwordExpiresAt: true,
    },
  });

  const totalPages = Math.ceil(total / pageSize);

  return {
    users,
    total,
    page,
    totalPages,
    pageSize,
  };
}, { admin: true });
