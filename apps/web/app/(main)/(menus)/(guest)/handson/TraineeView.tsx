"use client";

import { useState, useEffect, useCallback } from "react";
import SeatSelectionDialog from "@/components/handson/SeatSelectionDialog";
import HandsonMarkdownRenderer from "@/components/handson/HandsonMarkdownRenderer";
import HelpFloatingButton from "@/components/handson/HelpFloatingButton";
import { useFetchDocument } from "@/components/handson/hooks";
import {
  fetchActiveSessions,
  joinSession,
  leaveSession,
  postLog,
  postHelpRequest,
  fetchMyStatus,
} from "@/components/handson/api";
import { handsonTranslations } from "@/components/handson/translations";
import type { Language } from "@/components/handson/types";
import { TraineeContentSkeleton } from "@/components/handson/skeletons";

interface Props {
  language: Language;
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
  const tc = handsonTranslations[language].common;
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [savedStatuses, setSavedStatuses] = useState<Record<number, "ok" | "error">>({});

  const { parsed, loading } = useFetchDocument(sessionId);

  // セッション終了をポーリングで検知（10秒間隔）
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await fetchActiveSessions();
        const available = data.availableSessions || [];
        const stillAvailable = available.some((s) => s.id === sessionId);
        if (!stillAvailable) {
          clearInterval(interval);
          onSessionEnded?.();
        }
      } catch {
        // ignore polling errors
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
      fetchMyStatus(sessionId, savedPid)
        .then((data) => {
          if (data.statuses) setSavedStatuses(data.statuses);
        })
        .catch(() => {});
    }
  }, [sessionId]);

  // セッション参加
  async function handleJoin(seat: number, displayName: string): Promise<string | null> {
    try {
      const data = await joinSession(sessionId, { seatNumber: seat, displayName });
      setParticipantId(data.participantId);
      setSeatNumber(seat);
      localStorage.setItem(`handson_participant_${sessionId}`, data.participantId);
      localStorage.setItem(`handson_seat_${sessionId}`, String(seat));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Network error";
    }
  }

  // コマンドレポート
  const handleCommandReport = useCallback(
    async (commandIndex: number, status: "ok" | "error") => {
      if (!participantId) return;
      await postLog(sessionId, {
        participantId,
        type: status === "ok" ? "COMMAND_OK" : "COMMAND_ERROR",
        commandIndex,
        status: status.toUpperCase(),
      });
    },
    [sessionId, participantId],
  );

  // ヘルプリクエスト
  const handleHelpRequest = useCallback(
    async (sectionIndex: number) => {
      if (!participantId) return;
      await postHelpRequest(sessionId, { participantId, sectionIndex });
    },
    [sessionId, participantId],
  );

  if (loading) {
    return <TraineeContentSkeleton />;
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
        {tc.failedToLoadContent}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* 座席番号バッジ + 退出ボタン */}
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {tc.seat} {seatNumber}
        </span>
        <button
          onClick={async () => {
            if (participantId) {
              await leaveSession(sessionId, participantId).catch(() => {});
            }
            localStorage.removeItem(`handson_participant_${sessionId}`);
            localStorage.removeItem(`handson_seat_${sessionId}`);
            setParticipantId(null);
            setSeatNumber(null);
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          {tc.leaveSeat}
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
