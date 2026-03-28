"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const translations = {
  en: {
    help: "I need help",
    sent: "Help requested",
    sending: "Sending...",
  },
  ja: {
    help: "助けてほしい",
    sent: "送信しました",
    sending: "送信中...",
  },
};

interface Props {
  language: "en" | "ja";
  onRequest: (sectionIndex: number) => Promise<void>;
}

export default function HelpFloatingButton({ language, onRequest }: Props) {
  const t = translations[language];
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentSectionRef = useRef(0);

  // IntersectionObserverで現在表示セクションを追跡
  useEffect(() => {
    const sections = document.querySelectorAll("[data-section-index]");
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = parseInt(
              (entry.target as HTMLElement).dataset.sectionIndex || "0",
              10,
            );
            currentSectionRef.current = idx;
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const handleClick = useCallback(async () => {
    if (sent || loading) return;
    setLoading(true);
    try {
      await onRequest(currentSectionRef.current);
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } finally {
      setLoading(false);
    }
  }, [sent, loading, onRequest]);

  return (
    <button
      onClick={handleClick}
      disabled={loading || sent}
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition ${
        sent
          ? "bg-green-600 text-white"
          : "bg-red-500 text-white hover:bg-red-600 active:bg-red-700"
      } disabled:opacity-70`}
    >
      {sent ? (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {t.sent}
        </>
      ) : (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
          {loading ? t.sending : t.help}
        </>
      )}
    </button>
  );
}
