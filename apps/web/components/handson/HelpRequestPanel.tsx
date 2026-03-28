"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui";

const translations = {
  en: {
    noRequests: "No help requests at the moment.",
    seat: "Seat",
    section: "Section",
    resolve: "Resolved",
    helpRequests: "Help Requests",
  },
  ja: {
    noRequests: "現在、ヘルプリクエストはありません。",
    seat: "座席",
    section: "セクション",
    resolve: "対応済み",
    helpRequests: "ヘルプリクエスト",
  },
};

interface HelpRequest {
  logId: string;
  participantId: string;
  seatNumber: number;
  displayName: string;
  sectionIndex: number;
  message?: string;
  createdAt: string;
}

interface Props {
  language: "en" | "ja";
  sessionId: string;
}

const POLL_INTERVAL = 3000;

export default function HelpRequestPanel({ language, sessionId }: Props) {
  const t = translations[language];
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHelp = useCallback(async () => {
    try {
      const res = await fetch(`/api/handson/sessions/${sessionId}/help`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    fetchHelp();
    intervalRef.current = setInterval(fetchHelp, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchHelp]);

  async function handleResolve(logId: string) {
    try {
      await fetch(`/api/handson/sessions/${sessionId}/help?logId=${logId}`, {
        method: "DELETE",
      });
      setRequests((prev) => prev.filter((r) => r.logId !== logId));
    } catch {
      // ignore
    }
  }

  if (requests.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t.noRequests}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.logId}
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-sm animate-pulse dark:border-red-900 dark:bg-red-950/40"
        >
          <span className="text-lg font-bold text-red-700 dark:text-red-400">
            {t.seat} {req.seatNumber}
          </span>
          <span className="text-sm font-medium text-foreground">
            {req.displayName}
          </span>
          <span className="text-sm text-muted-foreground">
            {t.section} {req.sectionIndex + 1}
          </span>
          {req.message && (
            <span className="text-sm text-muted-foreground italic">
              {req.message}
            </span>
          )}
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolve(req.logId)}
            >
              {t.resolve}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
