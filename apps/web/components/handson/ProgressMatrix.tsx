"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const translations = {
  en: {
    seat: "Seat",
    noParticipants: "No participants have joined yet. Waiting for trainees to connect...",
    legend: { ok: "OK", error: "Error", none: "Not reported" },
  },
  ja: {
    seat: "座席",
    noParticipants: "参加者がまだいません。受講者の接続を待っています...",
    legend: { ok: "OK / できた", error: "エラー", none: "未報告" },
  },
};

type CommandStatus = "OK" | "ERROR";

interface ParticipantInfo {
  id: string;
  displayName: string;
  seatNumber: number;
}

interface ProgressData {
  participants: ParticipantInfo[];
  commands: Record<string, Record<number, CommandStatus>>;
  checkpoints: Record<string, number[]>;
}

interface Props {
  language: "en" | "ja";
  sessionId: string;
  totalCommands: number;
}

const POLL_INTERVAL = 3000;

export default function ProgressMatrix({ language, sessionId, totalCommands }: Props) {
  const t = translations[language];
  const [data, setData] = useState<ProgressData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  if (!data || data.participants.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t.noParticipants}
      </div>
    );
  }

  const participants = [...data.participants].sort((a, b) => a.seatNumber - b.seatNumber);
  const commandIndices = Array.from({ length: totalCommands }, (_, i) => i);

  return (
    <div>
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

      {/* マトリクステーブル */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 border-b border-r bg-muted/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                {t.seat}
              </th>
              {commandIndices.map((idx) => (
                <th
                  key={idx}
                  className="border-b px-1 py-2 text-center"
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    #{idx + 1}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => {
              const cmds = data.commands[p.id] || {};
              const hasError = Object.values(cmds).some((s) => s === "ERROR");

              return (
                <tr
                  key={p.id}
                  className={hasError ? "bg-orange-50/50 dark:bg-orange-950/20" : ""}
                >
                  <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {hasError && (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
                      )}
                      <span className="font-semibold">{p.seatNumber}</span>
                      <span className="text-xs text-muted-foreground">{p.displayName}</span>
                    </div>
                  </td>
                  {commandIndices.map((idx) => {
                    const status = cmds[idx];
                    return (
                      <td
                        key={idx}
                        className="border-b px-1 py-2 text-center"
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
  );
}
