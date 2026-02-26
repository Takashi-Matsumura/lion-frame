import { ApiError } from "./api-error";

interface PaginationResult {
  page: number;
  pageSize: number;
  skip: number;
}

interface PaginationOptions {
  defaultPageSize?: number;
  maxPageSize?: number;
}

/**
 * Parse and validate pagination parameters from URL search params.
 *
 * Usage:
 * ```ts
 * const { page, pageSize, skip } = parsePagination(request);
 * const [total, items] = await Promise.all([
 *   prisma.model.count({ where }),
 *   prisma.model.findMany({ where, skip, take: pageSize }),
 * ]);
 * return { items, total, page, totalPages: Math.ceil(total / pageSize), pageSize };
 * ```
 */
export function parsePagination(
  request: Request,
  options: PaginationOptions = {},
): PaginationResult {
  const { defaultPageSize = 20, maxPageSize = 100 } = options;
  const url = new URL(request.url);
  const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Number.parseInt(
    url.searchParams.get("pageSize") || String(defaultPageSize),
    10,
  );

  if (page < 1 || pageSize < 1 || pageSize > maxPageSize) {
    throw ApiError.badRequest("Invalid pagination parameters");
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

/**
 * Build a standard paginated response object.
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
    pageSize,
  };
}
