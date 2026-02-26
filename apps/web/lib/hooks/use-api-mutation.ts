"use client";

import { useCallback, useState } from "react";

interface MutationOptions {
  /** HTTP method. Default: "POST" */
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  /** Callback on success */
  onSuccess?: (data: unknown) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

interface UseApiMutationResult<TBody> {
  mutate: (url: string, body?: TBody) => Promise<unknown>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Hook for POST/PUT/PATCH/DELETE operations with loading/error state.
 *
 * Usage:
 * ```tsx
 * const { mutate, loading } = useApiMutation<{ name: string }>({
 *   method: "POST",
 *   onSuccess: () => refetchUsers(),
 * });
 * await mutate("/api/admin/users", { name: "John" });
 * ```
 */
export function useApiMutation<TBody = unknown>(
  options: MutationOptions = {},
): UseApiMutationResult<TBody> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { method = "POST", onSuccess, onError } = options;

  const mutate = useCallback(
    async (url: string, body?: TBody) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method,
          ...(body !== undefined && {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMsg = data.error || `Request failed (${response.status})`;
          setError(errorMsg);
          onError?.(errorMsg);
          return null;
        }

        onSuccess?.(data);
        return data;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        onError?.(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [method, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { mutate, loading, error, reset };
}
