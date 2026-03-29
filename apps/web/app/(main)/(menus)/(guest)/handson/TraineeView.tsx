"use client";

import { useState, useEffect, useCallback } from "react";
import SeatSelectionDialog from "@/components/handson/SeatSelectionDialog";
import HandsonMarkdownRenderer from "@/components/handson/HandsonMarkdownRenderer";
import HelpFloatingButton from "@/components/handson/HelpFloatingButton";
import { parseHandsonMarkdown } from "@/lib/addon-modules/handson/markdown-parser";
import type { ParsedHandson } from "@/lib/addon-modules/handson/markdown-parser";
import { PageSkeleton } from "@/components/ui/page-skeleton";

interface Props {
  language: "en" | "ja";
  sessionId: string;
  sessionTitle?: string;
  maxSeats: number;
  userId: string;
  userName: string;
  onSessionEnded?: () => void;
  onBack?: () => void;
}

export default function TraineeView({
  language,
  sessionId,
  sessionTitle,
  maxSeats,
  userId,
  userName,
  onSessionEnded,
  onBack,
}: Props) {
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [parsed, setParsed] = useState<ParsedHandson | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedStatuses, setSavedStatuses] = useState<Record<number, "ok" | "error">>({});

  // セッション終了をポーリングで検知（10秒間隔）
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/handson/active");
        const data = await res.json();
        if (!data.active || data.session?.id !== sessionId) {
          clearInterval(interval);
          onSessionEnded?.();
        }
      } catch {
        // ignore
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionId, onSessionEnded]);

  // localStorage復旧チェック + 既存回答状態の取得
  useEffect(() => {
    const savedPid = localStorage.getItem(`handson_participant_${sessionId}`);
    const savedSeat = localStorage.getItem(`handson_seat_${sessionId}`);
    if (savedPid && savedSeat) {
      setParticipantId(savedPid);
      setSeatNumber(parseInt(savedSeat, 10));
      // 既存の回答状態を取得
      fetch(`/api/handson/sessions/${sessionId}/my-status?participantId=${savedPid}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.statuses) setSavedStatuses(data.statuses);
        })
        .catch(() => {});
    }
    fetchDocument();
  }, [sessionId]);

  async function fetchDocument() {
    try {
      const res = await fetch(`/api/handson/sessions/${sessionId}/document`);
      if (!res.ok) return;
      const data = await res.json();
      const result = parseHandsonMarkdown(data.document.content);
      setParsed(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  // セッション参加
  async function handleJoin(seat: number, displayName: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/handson/sessions/${sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatNumber: seat, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        return data.error || "Failed to join";
      }
      setParticipantId(data.participantId);
      setSeatNumber(seat);
      localStorage.setItem(`handson_participant_${sessionId}`, data.participantId);
      localStorage.setItem(`handson_seat_${sessionId}`, String(seat));
      return null;
    } catch {
      return "Network error";
    }
  }

  // コマンドレポート
  const handleCommandReport = useCallback(
    async (commandIndex: number, status: "ok" | "error") => {
      if (!participantId) return;
      await fetch(`/api/handson/sessions/${sessionId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          type: status === "ok" ? "COMMAND_OK" : "COMMAND_ERROR",
          commandIndex,
          status: status.toUpperCase(),
        }),
      });
    },
    [sessionId, participantId],
  );

  // ヘルプリクエスト
  const handleHelpRequest = useCallback(
    async (sectionIndex: number) => {
      if (!participantId) return;
      await fetch(`/api/handson/sessions/${sessionId}/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          sectionIndex,
        }),
      });
    },
    [sessionId, participantId],
  );

  if (loading) {
    return <PageSkeleton />;
  }

  // 座席選択モーダル
  if (!participantId) {
    return (
      <SeatSelectionDialog
        language={language}
        maxSeats={maxSeats}
        sessionTitle={sessionTitle}
        defaultName={userName}
        onSubmit={handleJoin}
        onBack={onBack}
      />
    );
  }

  if (!parsed) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {language === "ja" ? "教材を読み込めませんでした" : "Failed to load content"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* 座席番号バッジ + 退出ボタン */}
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {language === "ja" ? `座席 ${seatNumber}` : `Seat ${seatNumber}`}
        </span>
        <button
          onClick={async () => {
            if (participantId) {
              await fetch(
                `/api/handson/sessions/${sessionId}/join?participantId=${participantId}`,
                { method: "DELETE" },
              ).catch(() => {});
            }
            localStorage.removeItem(`handson_participant_${sessionId}`);
            localStorage.removeItem(`handson_seat_${sessionId}`);
            setParticipantId(null);
            setSeatNumber(null);
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          {language === "ja" ? "退出する" : "Leave seat"}
        </button>
      </div>

      {/* 教材コンテンツ */}
      <HandsonMarkdownRenderer
        language={language}
        parsed={parsed}
        onCommandReport={handleCommandReport}
        initialStatuses={savedStatuses}
      />

      {/* ヘルプボタン */}
      <HelpFloatingButton
        language={language}
        onRequest={handleHelpRequest}
      />
    </div>
  );
}
