"use client";

import { useState, useEffect } from "react";
import TraineeView from "./TraineeView";
import InstructorView from "./InstructorView";
import { EmptyState } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const translations = {
  en: {
    noSession: "No active session",
    noSessionDesc: "No training session is currently running. Please wait for an instructor to start one.",
    loading: "Loading...",
  },
  ja: {
    noSession: "アクティブなセッションはありません",
    noSessionDesc: "現在、研修セッションが開催されていません。講師がセッションを開始するまでお待ちください。",
    loading: "読み込み中...",
  },
};

interface ActiveSessionInfo {
  id: string;
  title: string;
  documentId: string;
  maxSeats: number;
  participantCount: number;
  startedAt: string;
}

interface Props {
  language: "en" | "ja";
  userRole: string;
  userId: string;
  userName: string;
}

const INSTRUCTOR_ROLES = ["MANAGER", "EXECUTIVE", "ADMIN"];

export default function HandsonClient({ language, userRole, userId, userName }: Props) {
  const t = translations[language];
  const isInstructor = INSTRUCTOR_ROLES.includes(userRole);

  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);

  useEffect(() => {
    fetchActiveSession();
  }, []);

  async function fetchActiveSession() {
    try {
      const res = await fetch("/api/handson/active");
      const data = await res.json();
      if (data.active && data.session) {
        setActiveSession(data.session);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <PageSkeleton />;
  }

  // 講師ビュー
  if (isInstructor) {
    return (
      <InstructorView
        language={language}
        activeSessionId={activeSession?.id ?? null}
        onActiveChanged={(id) => {
          if (!id) {
            setActiveSession(null);
          } else {
            // アクティブが変わったら再取得
            fetch("/api/handson/active")
              .then((r) => r.json())
              .then((data) => {
                if (data.active && data.session) setActiveSession(data.session);
              })
              .catch(() => {});
          }
        }}
      />
    );
  }

  // 受講者ビュー（セッションがない場合）
  if (!activeSession) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          }
          message={t.noSession}
          description={t.noSessionDesc}
        />
      </div>
    );
  }

  // 受講者ビュー（セッションあり）
  return (
    <TraineeView
      language={language}
      sessionId={activeSession.id}
      maxSeats={activeSession.maxSeats}
      userId={userId}
      userName={userName}
    />
  );
}
