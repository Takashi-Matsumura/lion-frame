"use client";

import { useCallback, useEffect, useState } from "react";

const NEW_DAYS = 7;

/**
 * 未回答の新着フォーム数を取得するフック
 * サイドバーの「フォーム」メニューにバッジを表示するために使用
 */
export function useFormBadge() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/forms/badge");
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count ?? 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refresh();
    // 5分ごとにポーリング
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return count;
}
