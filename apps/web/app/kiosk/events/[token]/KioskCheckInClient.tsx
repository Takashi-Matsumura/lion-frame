"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KioskCheckInResult } from "@/components/kiosk/KioskCheckInResult";

type NfcReaderModule = typeof import("@/lib/addon-modules/nfc-card/nfc-reader");

interface CheckInResult {
  status: "checked_in" | "already_checked_in" | "card_not_found" | "employee_not_found";
  employee?: {
    name: string;
    position: string;
    department: string;
    profileImage: string | null;
  };
  checkedInAt?: string;
}

interface EventInfo {
  name: string;
  nameEn: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  capacity: number | null;
}

interface KioskCheckInClientProps {
  token: string;
  sessionName: string;
  initialAttendanceCount: number;
  event: EventInfo | null;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
}

export function KioskCheckInClient({
  token,
  sessionName,
  initialAttendanceCount,
  event,
}: KioskCheckInClientProps) {
  const [attendanceCount, setAttendanceCount] = useState(initialAttendanceCount);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  // "idle" = 初期, "polling" = NFC読み取りループ中, "paused" = 結果表示中で一時停止
  const [nfcState, setNfcState] = useState<"idle" | "polling" | "paused">("idle");

  const nfcModuleRef = useRef<NfcReaderModule | null>(null);
  const pollingRef = useRef(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayName = event?.name || sessionName;
  const timeRange =
    event?.startTime && event?.endTime
      ? `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`
      : event?.startTime
        ? `${formatTime(event.startTime)} ~`
        : null;

  const loadNfcModule = useCallback(async () => {
    if (!nfcModuleRef.current) {
      nfcModuleRef.current = await import(
        "@/lib/addon-modules/nfc-card/nfc-reader"
      );
    }
    return nfcModuleRef.current;
  }, []);

  const handleCheckIn = useCallback(
    async (nfcCardId: string) => {
      setIsProcessing(true);
      setError("");

      try {
        const res = await fetch(`/api/kiosk/events/${token}/check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nfcCardId }),
        });

        if (res.ok) {
          const data: CheckInResult = await res.json();
          setResult(data);
          if (data.status === "checked_in") {
            setAttendanceCount((prev) => prev + 1);
          }
        } else {
          setError("チェックインに失敗しました");
        }
      } catch {
        setError("通信エラー");
      } finally {
        setIsProcessing(false);
      }
    },
    [token],
  );

  /**
   * NFCポーリングループ
   *
   * カードが検出されるまで静かにリトライし続ける。
   * "カードが検出されませんでした" はエラーではなく正常な待機状態。
   * デバイス接続エラーやWebUSB非対応のみをエラーとして表示。
   */
  const startPolling = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setNfcState("polling");
    setError("");

    try {
      const nfc = await loadNfcModule();
      if (!nfc.isWebUsbSupported()) {
        setError("WebUSB未対応のブラウザです。Chrome/Edgeをご利用ください。");
        setNfcState("idle");
        pollingRef.current = false;
        return;
      }

      while (pollingRef.current) {
        try {
          const readResult = await nfc.connectAndRead();
          if (readResult.cardId && pollingRef.current) {
            // カード検出 → ポーリング一時停止 → チェックイン処理
            setNfcState("paused");
            pollingRef.current = false;
            await handleCheckIn(readResult.cardId);
            return;
          }
        } catch (err) {
          // "カードが検出されませんでした" は無視して次のポーリングへ
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("カードが検出されません")) {
            // 正常な待機状態 — 少し待ってからリトライ
            await new Promise((r) => setTimeout(r, 800));
            continue;
          }
          // デバイス接続エラーなど — リトライ間隔を長めに
          console.warn("[Kiosk NFC]", msg);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
      }
    } catch (err) {
      // モジュール読み込みエラー等
      const msg = err instanceof Error ? err.message : "NFC初期化エラー";
      if (msg.includes("WebUSB")) {
        setError("WebUSB未対応のブラウザです。Chrome/Edgeをご利用ください。");
      } else if (msg.includes("No device selected") || msg.includes("user cancelled")) {
        // ユーザーがデバイス選択をキャンセル
        setError("NFCリーダーを選択してください。");
      } else {
        setError(`NFC接続エラー: ${msg}`);
      }
      setNfcState("idle");
      pollingRef.current = false;
    }
  }, [loadNfcModule, handleCheckIn]);

  const stopPolling = useCallback(() => {
    pollingRef.current = false;
  }, []);

  // 結果表示後5秒でリセット → ポーリング再開
  useEffect(() => {
    if (result || error) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setResult(null);
        setError("");
        // ポーリング再開
        startPolling();
      }, 5000);
    }
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [result, error, startPolling]);

  // 初回マウント時にポーリング開始
  useEffect(() => {
    startPolling();
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white truncate">
            {displayName}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
            {event?.date && <span>{formatDate(event.date)}</span>}
            {timeRange && <span>{timeRange}</span>}
            {event?.location && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.location}
              </span>
            )}
          </div>
        </div>
        <div className="text-right ml-6 shrink-0">
          <p className="text-4xl font-bold text-white tabular-nums">
            {attendanceCount}
            {event?.capacity && (
              <span className="text-lg text-gray-500 font-normal">
                {" "}/ {event.capacity}
              </span>
            )}
          </p>
          <p className="text-sm text-gray-400">出席者</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        {result ? (
          <div className="w-full max-w-lg">
            <KioskCheckInResult result={result} />
          </div>
        ) : (
          <div className="text-center space-y-8">
            {/* NFC Waiting Animation */}
            <div className="relative w-32 h-32 mx-auto">
              {nfcState === "polling" && (
                <>
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping [animation-duration:2s]" />
                  <div className="absolute inset-4 bg-blue-500/10 rounded-full animate-ping [animation-duration:2s] [animation-delay:0.5s]" />
                </>
              )}
              <div className={`relative w-32 h-32 border-2 rounded-full flex items-center justify-center ${
                nfcState === "polling"
                  ? "bg-gray-800/80 border-blue-500/30"
                  : "bg-gray-800/50 border-gray-700"
              }`}>
                <svg
                  className={`w-12 h-12 ${nfcState === "polling" ? "text-blue-400" : "text-gray-600"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0"
                  />
                  <circle cx="12" cy="18" r="1.5" fill="currentColor" />
                </svg>
              </div>
            </div>

            <div>
              <p className="text-2xl text-gray-300">
                {isProcessing
                  ? "処理中..."
                  : nfcState === "polling"
                    ? "NFCカードをかざしてください"
                    : "NFC待機中..."}
              </p>
              <p className="text-lg text-gray-500 mt-2">
                Hold your NFC card to the reader
              </p>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-400">{error}</p>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
                  onClick={() => {
                    setError("");
                    startPolling();
                  }}
                >
                  再試行
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-3 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-600">
          Powered by LionFrame
        </p>
      </footer>
    </div>
  );
}
