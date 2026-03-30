"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui";
import { handsonTranslations } from "./translations";
import { usePolling } from "./hooks";
import { fetchHelpRequests as apiFetchHelp, resolveHelpRequest } from "./api";
import type { Language, HelpRequestInfo } from "./types";

interface Props {
  language: Language;
  sessionId: string;
}

const POLL_INTERVAL = 3000;

export default function HelpRequestPanel({ language, sessionId }: Props) {
  const tc = handsonTranslations[language].common;
  const t = handsonTranslations[language].helpPanel;

  const fetchFn = useCallback(() => apiFetchHelp(sessionId), [sessionId]);
  const { data: requests, hasConnectionIssue, refresh } = usePolling<HelpRequestInfo[]>(fetchFn, POLL_INTERVAL);

  async function handleResolve(logId: string) {
    try {
      await resolveHelpRequest(sessionId, logId);
      refresh();
    } catch {
      // handled by api layer
    }
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {hasConnectionIssue ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400">{tc.connectionError}</span>
            <button
              onClick={refresh}
              className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/40"
            >
              {tc.retry}
            </button>
          </div>
        ) : (
          t.noRequests
        )}
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
            {tc.seat} {req.seatNumber}
          </span>
          <span className="text-sm font-medium text-foreground">
            {req.displayName}
          </span>
          <span className="text-sm text-muted-foreground">
            {tc.section} {req.sectionIndex + 1}
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
              {tc.resolve}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
