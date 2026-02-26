"use client";

import { useCallback, useState } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationResult {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  /** Build query string for API call: "page=1&pageSize=20" */
  queryString: string;
  /** Go to next page if available */
  nextPage: () => void;
  /** Go to previous page if available */
  prevPage: () => void;
}

/**
 * Hook for pagination state management.
 *
 * Usage:
 * ```tsx
 * const pagination = usePagination({ initialPageSize: 25 });
 * const url = `/api/admin/users?${pagination.queryString}&search=${query}`;
 *
 * // After API response
 * pagination.setTotal(response.total);
 * ```
 */
export function usePagination(
  options: UsePaginationOptions = {},
): UsePaginationResult {
  const { initialPage = 1, initialPageSize = 20 } = options;
  const [page, setPageRaw] = useState(initialPage);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setPage = useCallback(
    (newPage: number) => {
      setPageRaw(Math.max(1, Math.min(newPage, totalPages)));
    },
    [totalPages],
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPageRaw(1);
  }, []);

  const nextPage = useCallback(() => {
    setPageRaw((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPageRaw((p) => Math.max(p - 1, 1));
  }, []);

  const queryString = `page=${page}&pageSize=${pageSize}`;

  return {
    page,
    pageSize,
    totalPages,
    total,
    setPage,
    setPageSize,
    setTotal,
    queryString,
    nextPage,
    prevPage,
  };
}
