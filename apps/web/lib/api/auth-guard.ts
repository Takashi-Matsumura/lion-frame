import type { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { ApiError } from "./api-error";

/**
 * Require an authenticated session. Throws ApiError if not authenticated.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    throw ApiError.unauthorized();
  }
  return session;
}

/**
 * Require ADMIN role. Throws ApiError if not admin.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw ApiError.unauthorized();
  }
  return session;
}

/**
 * ロール階層の数値マッピング。値が大きいほど権限が強い。
 * 階層判定（最低ロール以上か）や `expandMinimumRole` などで利用する。
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  GUEST: 0,
  USER: 1,
  MANAGER: 2,
  EXECUTIVE: 3,
  ADMIN: 4,
};

/**
 * 指定された最低ロール以上のロール一覧を返す。
 *
 * 例: `expandMinimumRole("MANAGER")` → `["MANAGER", "EXECUTIVE", "ADMIN"]`
 */
export function expandMinimumRole(minimum: Role): Role[] {
  const minLevel = ROLE_HIERARCHY[minimum];
  return (Object.keys(ROLE_HIERARCHY) as Role[]).filter(
    (role) => ROLE_HIERARCHY[role] >= minLevel,
  );
}

/**
 * Require a minimum role level. Throws ApiError if insufficient.
 *
 * Usage:
 *   const session = await requireRole("MANAGER"); // MANAGER, EXECUTIVE, ADMIN OK
 */
export async function requireRole(minimumRole: Role): Promise<Session> {
  const session = await requireAuth();
  const userLevel = ROLE_HIERARCHY[session.user.role];
  if (userLevel === undefined) {
    throw ApiError.unauthorized();
  }
  const requiredLevel = ROLE_HIERARCHY[minimumRole];
  if (requiredLevel === undefined || userLevel < requiredLevel) {
    throw ApiError.unauthorized();
  }
  return session;
}

/**
 * Require one of the specified roles. Throws ApiError if not matched.
 *
 * Usage:
 *   const session = await requireOneOfRoles(["ADMIN", "MANAGER"]);
 */
export async function requireOneOfRoles(roles: Role[]): Promise<Session> {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw ApiError.unauthorized();
  }
  return session;
}
