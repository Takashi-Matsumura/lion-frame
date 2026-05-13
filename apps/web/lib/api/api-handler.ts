import type { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { checkAccess } from "@/lib/auth/access-checker";
import { ApiError } from "./api-error";
import {
  expandMinimumRole,
  requireAdmin,
  requireAuth,
  requireOneOfRoles,
  requireRole,
} from "./auth-guard";

type HandlerFn<T = unknown, Ctx = unknown> = (
  request: Request,
  session: Session,
  context: Ctx,
) => Promise<T>;

interface ApiHandlerOptions {
  /** Require ADMIN role */
  admin?: boolean;
  /** Require minimum role level */
  requiredRole?: Role;
  /** Require one of specified roles */
  requiredRoles?: Role[];
  /** Allow unauthenticated access (e.g., health check). Default: false */
  public?: boolean;
  /**
   * AccessKey 経由でのアクセスを許可するメニューパス。
   *
   * 設定時は `requireAuth()` 後に `checkAccess(session, menuPath, allowedRoles)` を呼び、
   * 「許可ロールに含まれる」または「AccessKey で当該 menuPath が許可されている」
   * のいずれかを満たせば通過する。
   *
   * 許可ロールの決定順序:
   * 1. `requiredRoles` が指定されていればそれを使用
   * 2. `requiredRole`（最低ロール）が指定されていれば階層展開して使用
   *    （例: `"MANAGER"` → `["MANAGER", "EXECUTIVE", "ADMIN"]`）
   * 3. いずれも未指定の場合、`checkAccess` のデフォルト `["MANAGER", "ADMIN"]` が適用される
   *
   * USER ロール向けの API に `menuPath` を付ける場合は `requiredRoles: ["USER", ...]`
   * を明示すること。未指定だと USER は AccessKey が無い限り弾かれる。
   *
   * `admin: true` とは意味論的に矛盾するため併用不可（ラッパ構築時に Error を throw）。
   */
  menuPath?: string;
  /** HTTP status code for successful response. Default: 200 */
  successStatus?: number;
}

/**
 * Wraps an API route handler with standardized auth, error handling, and response format.
 *
 * Usage:
 * ```ts
 * export const GET = apiHandler(async (req, session) => {
 *   const items = await prisma.item.findMany();
 *   return { items };
 * }, { admin: true });
 *
 * // Dynamic routes can receive Next.js route context as the third argument.
 * export const DELETE = apiHandler<
 *   { success: true },
 *   { params: Promise<{ id: string }> }
 * >(async (req, session, { params }) => {
 *   const { id } = await params;
 *   await prisma.item.delete({ where: { id } });
 *   return { success: true };
 * });
 * ```
 */
export function apiHandler<T, Ctx = unknown>(
  handler: HandlerFn<T, Ctx>,
  options: ApiHandlerOptions = {},
): (request: Request, context?: Ctx) => Promise<NextResponse> {
  if (options.menuPath && options.admin) {
    throw new Error(
      "apiHandler: `menuPath` cannot be combined with `admin: true`. " +
        "Use `requiredRoles: ['ADMIN']` with `menuPath` to allow AccessKey fallback, " +
        "or drop `menuPath` for strict ADMIN-only access.",
    );
  }

  return async (request: Request, context?: Ctx) => {
    try {
      let session: Session;

      if (options.public) {
        // Public endpoints still try to get session but don't require it
        const { auth } = await import("@/auth");
        session = (await auth()) as Session;
      } else if (options.menuPath) {
        // AccessKey フォールバックあり: 認証必須、ロール/AccessKey のいずれかで許可
        session = await requireAuth();
        const allowedRoles =
          options.requiredRoles ??
          (options.requiredRole
            ? expandMinimumRole(options.requiredRole)
            : undefined);
        const allowed = await checkAccess(
          session,
          options.menuPath,
          allowedRoles,
        );
        if (!allowed) {
          throw ApiError.unauthorized();
        }
      } else if (options.admin) {
        session = await requireAdmin();
      } else if (options.requiredRoles) {
        session = await requireOneOfRoles(options.requiredRoles);
      } else if (options.requiredRole) {
        session = await requireRole(options.requiredRole);
      } else {
        session = await requireAuth();
      }

      const result = await handler(request, session, context as Ctx);
      return NextResponse.json(result, {
        status: options.successStatus ?? 200,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(error.toJSON(), { status: error.status });
      }

      console.error(
        `[API Error] ${request.method} ${new URL(request.url).pathname}:`,
        error,
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
