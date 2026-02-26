import type { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { ApiError } from "./api-error";
import {
  requireAdmin,
  requireAuth,
  requireOneOfRoles,
  requireRole,
} from "./auth-guard";

type HandlerFn<T = unknown> = (
  request: Request,
  session: Session,
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
 * export const POST = apiHandler(async (req, session) => {
 *   const body = await req.json();
 *   const item = await prisma.item.create({ data: body });
 *   return { item };
 * }, { admin: true, successStatus: 201 });
 * ```
 */
export function apiHandler<T>(
  handler: HandlerFn<T>,
  options: ApiHandlerOptions = {},
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      let session: Session;

      if (options.public) {
        // Public endpoints still try to get session but don't require it
        const { auth } = await import("@/auth");
        session = (await auth()) as Session;
      } else if (options.admin) {
        session = await requireAdmin();
      } else if (options.requiredRoles) {
        session = await requireOneOfRoles(options.requiredRoles);
      } else if (options.requiredRole) {
        session = await requireRole(options.requiredRole);
      } else {
        session = await requireAuth();
      }

      const result = await handler(request, session);
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
