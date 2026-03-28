"use client";

import { useState } from "react";

const translations = {
  en: {
    ok: "OK",
    error: "Error",
    resolved: "Resolved",
    errorReported: "Error reported",
    sending: "Sending...",
  },
  ja: {
    ok: "OK",
    error: "エラーが出た",
    resolved: "解決した",
    errorReported: "エラーを報告しました",
    sending: "送信中...",
  },
};

type Status = "ok" | "error" | null;

interface Props {
  language: "en" | "ja";
  globalNumber: number;
  onReport: (status: "ok" | "error") => Promise<void>;
}

export default function CommandStatusButtons({
  language,
  globalNumber,
  onReport,
}: Props) {
  const t = translations[language];
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  const label = `#${globalNumber}`;

  async function report(newStatus: "ok" | "error") {
    if (loading) return;
    setLoading(true);
    try {
      await onReport(newStatus);
      setStatus(newStatus);
    } finally {
      setLoading(false);
    }
  }

  if (status === "ok") {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <span className="font-mono text-xs text-muted-foreground">{label}</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {t.ok}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="font-mono text-xs text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
          {t.errorReported}
        </span>
        <button
          onClick={() => report("ok")}
          className="ml-2 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
        >
          {t.resolved}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <button
        onClick={() => report("ok")}
        disabled={loading}
        className="flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {loading ? t.sending : t.ok}
      </button>
      <button
        onClick={() => report("error")}
        disabled={loading}
        className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        {t.error}
      </button>
    </div>
  );
}
