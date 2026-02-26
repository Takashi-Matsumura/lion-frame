"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseApiOptions {
  /** Skip initial fetch. Default: false */
  skip?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for GET data fetching with loading/error state management.
 *
 * Usage:
 * ```tsx
 * const { data, loading, error, refetch } = useApi<User[]>("/api/admin/users");
 * const { data: modules } = useApi<ModulesData>("/api/admin/modules", { skip: !isAdmin });
 * ```
 */
export function useApi<T>(
  url: string | null,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const fetchData = useCallback(async () => {
    const currentUrl = urlRef.current;
    if (!currentUrl) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(currentUrl);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${response.status})`);
      }
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!options.skip && url) {
      fetchData();
    }
  }, [url, options.skip, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
