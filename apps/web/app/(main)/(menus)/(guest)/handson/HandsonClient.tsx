"use client";

import { useState, useEffect } from "react";
import TraineeView from "./TraineeView";
import InstructorView from "./InstructorView";
import { EmptyState } from "@/components/ui";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const translations = {
  en: {
    noSession: "No active session",
    noSessionDesc: "No training session is currently running. Please wait for an instructor to start one.",
    selectSession: "Select a Session",
    selectSessionDesc: "Multiple sessions are available. Please select the one you want to join.",
    join: "Join",
    active: "Active",
    rehearsal: "Rehearsal",
    seats: "seats",
  },
  ja: {
    noSession: "アクティブなセッションはありません",
    noSessionDesc: "現在、研修セッションが開催されていません。講師がセッションを開始するまでお待ちください。",
    selectSession: "セッションを選択",
    selectSessionDesc: "参加可能なセッションが複数あります。参加するセッションを選択してください。",
    join: "参加",
    active: "開催中",
    rehearsal: "リハーサル",
    seats: "席",
  },
};

interface AvailableSession {
  id: string;
  title: string;
  documentId: string;
  maxSeats: number;
  participantCount: number;
  startedAt: string;
  mode: "active" | "rehearsal";
}

interface Props {
  language: "en" | "ja";
  userRole: string;
  userId: string;
  userName: string;
  hasHandsonAccessKey?: boolean;
}

const INSTRUCTOR_ROLES = ["MANAGER", "EXECUTIVE", "ADMIN"];

export default function HandsonClient({ language, userRole, userId, userName, hasHandsonAccessKey }: Props) {
  const t = translations[language];
  const isInstructor = INSTRUCTOR_ROLES.includes(userRole) || hasHandsonAccessKey === true;

  const [loading, setLoading] = useState(true);
  const [availableSessions, setAvailableSessions] = useState<AvailableSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AvailableSession | null>(null);
  const [rehearsalSessionId, setRehearsalSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSession();
  }, []);

  async function fetchActiveSession() {
    try {
      const res = await fetch("/api/handson/active");
      const data = await res.json();
      setAvailableSessions(data.availableSessions || []);
      if (data.rehearsalSessionId) {
        setRehearsalSessionId(data.rehearsalSessionId);
      }
      // 受講者で1つだけの場合は自動選択
      if (!isInstructor && data.availableSessions?.length === 1) {
        setSelectedSession(data.availableSessions[0]);
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
    const activeSession = availableSessions.find((s) => s.mode === "active");
    return (
      <InstructorView
        language={language}
        userId={userId}
        userRole={userRole}
        activeSessionId={activeSession?.id ?? null}
        rehearsalSessionId={rehearsalSessionId}
        onActiveChanged={(id) => {
          if (!id) {
            setAvailableSessions((prev) => prev.filter((s) => s.mode !== "active"));
          } else {
            fetch("/api/handson/active")
              .then((r) => r.json())
              .then((data) => {
                setAvailableSessions(data.availableSessions || []);
              })
              .catch(() => {});
          }
        }}
        onRehearsalChanged={(id) => setRehearsalSessionId(id)}
      />
    );
  }

  // 受講者: セッション選択済み → TraineeView
  if (selectedSession) {
    return (
      <TraineeView
        language={language}
        sessionId={selectedSession.id}
        sessionTitle={selectedSession.title}
        maxSeats={selectedSession.maxSeats}
        userId={userId}
        userName={userName}
        onSessionEnded={() => {
          setSelectedSession(null);
          setAvailableSessions((prev) => prev.filter((s) => s.id !== selectedSession.id));
        }}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  // 受講者: 複数セッションから選択
  if (availableSessions.length > 1) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">{t.selectSession}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.selectSessionDesc}</p>
          </div>
          <div className="space-y-3">
            {availableSessions.map((session) => (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSession(session)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedSession(session); }}
                className="w-full rounded-lg border bg-card p-4 text-left transition cursor-pointer hover:bg-muted/50 hover:border-primary/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{session.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {session.participantCount}/{session.maxSeats} {t.seats}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.mode === "active" ? (
                      <Badge variant="default" className="bg-green-600">{t.active}</Badge>
                    ) : (
                      <Badge variant="default" className="bg-amber-500">{t.rehearsal}</Badge>
                    )}
                    <Button size="sm">{t.join}</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 受講者: セッションなし
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
