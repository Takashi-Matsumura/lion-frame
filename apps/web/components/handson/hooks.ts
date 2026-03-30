"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { parseHandsonMarkdown } from "@/lib/addon-modules/handson/markdown-parser";
import type { ParsedHandson } from "@/lib/addon-modules/handson/markdown-parser";
import { fetchDocument as apiFetchDocument } from "./api";

/** 連続失敗が何回でコネクション問題とみなすか */
const CONNECTION_ISSUE_THRESHOLD = 3;

/**
 * ポーリングhook
 *
 * 一定間隔で fetchFn を呼び出し、結果を保持する。
 * enabled=false でポーリングを一時停止、アンマウント時に自動クリーンアップ。
 *
 * - `failCount`: 連続失敗回数（成功時に0リセット）
 * - `hasConnectionIssue`: 3回以上連続失敗で true（復帰時に自動 false）
 * - `refresh()`: 手動で即座に再取得
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number,
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [failCount, setFailCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const doFetch = useCallback(async () => {
    try {
      const result = await fetchFnRef.current();
      setData(result);
      setError(null);
      setFailCount(0);
      setIsLoading(false);
    } catch (e) {
      setFailCount((prev) => prev + 1);
      setError(e instanceof Error ? e : new Error(String(e)));
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    doFetch();
  }, [doFetch]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    doFetch();
    intervalRef.current = setInterval(doFetch, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, doFetch]);

  const hasConnectionIssue = failCount >= CONNECTION_ISSUE_THRESHOLD;

  return { data, isLoading, error, failCount, hasConnectionIssue, refresh };
}

/**
 * ドキュメント取得 + マークダウンパースhook
 *
 * InstructorView と TraineeView で重複していたロジックを統合。
 */
export function useFetchDocument(sessionId: string | null) {
  const [parsed, setParsed] = useState<ParsedHandson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setParsed(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetchDocument(sessionId)
      .then((data) => {
        if (cancelled) return;
        const result = parseHandsonMarkdown(data.document.content);
        setParsed(result);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return { parsed, loading, error };
}
