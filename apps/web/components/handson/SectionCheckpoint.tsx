"use client";

import { useState } from "react";

const translations = {
  en: {
    done: "Done",
    completed: "Completed",
    sending: "Sending...",
  },
  ja: {
    done: "できた",
    completed: "完了",
    sending: "送信中...",
  },
};

interface Props {
  language: "en" | "ja";
  onComplete: () => Promise<void>;
}

export default function SectionCheckpoint({ language, onComplete }: Props) {
  const t = translations[language];
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (done || loading) return;
    setLoading(true);
    try {
      await onComplete();
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="my-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {t.completed}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="my-6 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/60"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="4" />
      </svg>
      {loading ? t.sending : t.done}
    </button>
  );
}
