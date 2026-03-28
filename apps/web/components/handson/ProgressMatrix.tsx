"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const translations = {
  en: {
    seat: "Seat",
    noParticipants: "No participants have joined yet. Waiting for trainees to connect...",
    legend: { ok: "OK", error: "Error", none: "Not reported" },
    helpAlert: "Help requested",
    section: "Section",
    resolve: "Resolved",
    instructor: "Instructor",
  },
  ja: {
    seat: "座席",
    noParticipants: "参加者がまだいません。受講者の接続を待っています...",
    legend: { ok: "OK / できた", error: "エラー", none: "未報告" },
    helpAlert: "ヘルプ依頼",
    section: "セクション",
    resolve: "対応済み",
    instructor: "講師",
  },
};

type CommandStatus = "OK" | "ERROR";

interface ParticipantInfo {
  id: string;
  displayName: string;
  seatNumber: number;
}

interface HelpRequestInfo {
  logId: string;
  participantId: string;
  seatNumber: number;
  displayName: string;
  sectionIndex: number;
  message?: string;
  createdAt: string;
}

interface ProgressData {
  participants: ParticipantInfo[];
  commands: Record<string, Record<number, CommandStatus>>;
  checkpoints: Record<string, number[]>;
  helpRequests: HelpRequestInfo[];
  instructorCheckpoints: number[];
}

interface Props {
  language: "en" | "ja";
  sessionId: string;
  totalCommands: number;
  onCommandClick?: (commandIndex: number) => void;
}

const POLL_INTERVAL = 3000;
const SEAT_COL_W = 100;
const CELL_COL_W = 36;

export default function ProgressMatrix({ language, sessionId, totalCommands, onCommandClick }: Props) {
  const t = translations[language];
  const [data, setData] = useState<ProgressData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const prevLastCheckpoint = useRef<number | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/handson/sessions/${sessionId}/progress`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    fetchProgress();
    intervalRef.current = setInterval(fetchProgress, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchProgress]);

  // ヘッダーとボディの横スクロールを同期
  function syncScroll(source: "header" | "body") {
    if (syncing.current) return;
    syncing.current = true;
    const from = source === "header" ? headerRef.current : bodyRef.current;
    const to = source === "header" ? bodyRef.current : headerRef.current;
    if (from && to) to.scrollLeft = from.scrollLeft;
    syncing.current = false;
  }

  // 講師チェックポイントの最新位置に自動スクロール
  useEffect(() => {
    if (!data) return;
    const icps = data.instructorCheckpoints || [];
    if (icps.length === 0) return;
    const lastIdx = icps[icps.length - 1];
    if (lastIdx === prevLastCheckpoint.current) return;
    prevLastCheckpoint.current = lastIdx;

    // ヘッダーテーブル内の該当セルにスクロール
    if (headerRef.current) {
      const cell = headerRef.current.querySelector(`[data-instructor-col="${lastIdx}"]`);
      if (cell) {
        cell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (data.participants.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t.noParticipants}
      </div>
    );
  }

  const participants = [...data.participants].sort((a, b) => a.seatNumber - b.seatNumber);
  const commandIndices = Array.from({ length: totalCommands }, (_, i) => i);
  const helpRequests = data.helpRequests || [];
  const instructorCheckpoints = data.instructorCheckpoints || [];
  const tableWidth = SEAT_COL_W + commandIndices.length * CELL_COL_W;

  async function handleResolveHelp(logId: string) {
    try {
      await fetch(`/api/handson/sessions/${sessionId}/help?logId=${logId}`, {
        method: "DELETE",
      });
    } catch {
      // ignore
    }
  }

  function colGroup() {
    return (
      <colgroup>
        <col style={{ width: SEAT_COL_W, minWidth: SEAT_COL_W }} />
        {commandIndices.map((idx) => (
          <col key={idx} style={{ width: CELL_COL_W, minWidth: CELL_COL_W }} />
        ))}
      </colgroup>
    );
  }

  return (
    <div>
      {/* ヘルプリクエストアラート */}
      {helpRequests.length > 0 && (
        <div className="mb-4 space-y-2">
          {helpRequests.map((req) => (
            <div
              key={req.logId}
              className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 animate-pulse dark:border-red-900 dark:bg-red-950/40"
            >
              <svg className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
              </svg>
              <span className="font-bold text-red-700 dark:text-red-400">
                {t.seat} {req.seatNumber}
              </span>
              <span className="text-sm font-medium text-foreground">{req.displayName}</span>
              <span className="text-sm text-muted-foreground">
                {t.section} {req.sectionIndex + 1}
              </span>
              <button
                onClick={() => handleResolveHelp(req.logId)}
                className="ml-auto rounded-md border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition"
              >
                {t.resolve}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 凡例 */}
      <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-500" /> {t.legend.ok}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-500" /> {t.legend.error}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-muted" /> {t.legend.none}
        </span>
      </div>

      {/* マトリクステーブル（ヘッダー固定 + ボディスクロール） */}
      <div className="rounded-lg border">
        {/* ヘッダー（横スクロール付き） */}
        <div
          ref={headerRef}
          onScroll={() => syncScroll("header")}
          className="overflow-x-auto border-b-2 border-border"
        >
          <table
            className="border-collapse text-sm"
            style={{ width: tableWidth, tableLayout: "fixed" }}
          >
            {colGroup()}
            <thead>
              <tr>
                <th className="border-b border-r bg-muted px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  {t.seat}
                </th>
                {commandIndices.map((idx) => (
                  <th key={idx} className="border-b bg-muted px-1 py-2 text-center">
                    <button
                      onClick={() => onCommandClick?.(idx)}
                      className="font-mono text-[10px] text-muted-foreground hover:text-primary hover:underline transition cursor-pointer"
                    >
                      #{idx + 1}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-blue-50 dark:bg-blue-950/30">
                <td className="border-r bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 dark:border-border dark:bg-blue-950/30 dark:text-blue-200">
                  {t.instructor}
                </td>
                {commandIndices.map((idx) => {
                  const checked = instructorCheckpoints.includes(idx);
                  return (
                    <td
                      key={idx}
                      data-instructor-col={idx}
                      className="bg-blue-50 px-1 py-1.5 text-center dark:bg-blue-950/30"
                    >
                      {checked ? (
                        <span className="inline-block h-4 w-4 rounded bg-blue-500 text-[10px] leading-4 text-white">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-block h-4 w-4 rounded bg-blue-100 dark:bg-blue-900/40" />
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ボディ（横スクロール同期 + 縦スクロール） */}
        <div
          ref={bodyRef}
          onScroll={() => syncScroll("body")}
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: "400px" }}
        >
          <table
            className="border-collapse text-sm"
            style={{ width: tableWidth, tableLayout: "fixed" }}
          >
            {colGroup()}
            <tbody>
              {participants.map((p) => {
                const cmds = data.commands[p.id] || {};

                return (
                  <tr key={p.id}>
                    <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.seatNumber}</span>
                        <span className="text-xs text-muted-foreground">{p.displayName}</span>
                      </div>
                    </td>
                    {commandIndices.map((idx) => {
                      const status = cmds[idx];
                      return (
                        <td
                          key={idx}
                          className="border-b bg-card px-1 py-2 text-center"
                        >
                          {status === "OK" ? (
                            <span className="inline-block h-4 w-4 rounded bg-green-500 text-[10px] leading-4 text-white">
                              ✓
                            </span>
                          ) : status === "ERROR" ? (
                            <span className="inline-block h-4 w-4 rounded bg-red-500 text-[10px] leading-4 text-white">
                              !
                            </span>
                          ) : (
                            <span className="inline-block h-4 w-4 rounded bg-muted" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
