"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * キオスクログインページ
 *
 * セッショントークンを入力（またはURLパラメータから取得）し、
 * 検証成功で署名Cookie設定 → キオスク画面へリダイレクト。
 */
export default function KioskLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback(
    async (loginToken: string) => {
      if (!loginToken.trim()) return;
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch("/api/kiosk/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: loginToken.trim() }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.session.moduleId === "event-attendance") {
            router.push(`/kiosk/events/${loginToken.trim()}`);
          }
        } else {
          const data = await res.json();
          setError(data.error || "Invalid token");
        }
      } catch {
        setError("Connection error");
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  // Auto-login from URL parameter
  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
      handleLogin(urlToken);
    }
  }, [searchParams, handleLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Kiosk</h1>
          <p className="mt-2 text-gray-400">
            セッショントークンを入力してください
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Session token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin(token)}
            autoFocus
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="button"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-lg font-medium transition-colors"
            onClick={() => handleLogin(token)}
            disabled={isLoading || !token.trim()}
          >
            {isLoading ? "..." : "Enter"}
          </button>
        </div>
      </div>
    </div>
  );
}
