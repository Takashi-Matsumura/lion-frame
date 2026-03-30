"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import { handsonTranslations } from "./translations";
import {
  fetchSessions as apiFetchSessions,
  createSession as apiCreateSession,
  patchSession,
  deleteSession as apiDeleteSession,
} from "./api";
import type { Language, SessionInfo } from "./types";
import type { SessionStatus } from "./SessionListTable";
import SessionCreateForm from "./SessionCreateForm";
import SessionListTable from "./SessionListTable";
import { SessionManagerSkeleton } from "./skeletons";

interface Props {
  language: Language;
  userId: string;
  userRole: string;
  activeSessionId: string | null;
  rehearsalSessionId?: string | null;
  onSessionSelected: (session: SessionInfo | null) => void;
  onActiveChanged: (activeId: string | null) => void;
  onRehearsalChanged?: (rehearsalId: string | null) => void;
  onLoaded?: () => void;
}

export default function SessionManager({
  language,
  userId,
  userRole,
  activeSessionId,
  rehearsalSessionId: initialRehearsalId,
  onSessionSelected,
  onActiveChanged,
  onRehearsalChanged,
  onLoaded,
}: Props) {
  const t = handsonTranslations[language].sessionManager;
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [rehearsalId, setRehearsalId] = useState<string | null>(initialRehearsalId ?? null);
  const [showForm, setShowForm] = useState(false);
  const [loadingAction, setLoadingAction] = useState<{ id: string; action: string } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(activeSessionId);

  const fetchSessionList = useCallback(async () => {
    try {
      const list = await apiFetchSessions();
      setSessions(list);
    } catch {
      // handled by api layer
    } finally {
      setInitialLoading(false);
      onLoaded?.();
    }
  }, [onLoaded]);

  useEffect(() => {
    fetchSessionList();
  }, [fetchSessionList]);

  // --- Action handlers ---

  async function handleCreate(params: { title: string; date: string; documentId: string; maxSeats: number }) {
    setLoadingAction({ id: "", action: "create" });
    try {
      await apiCreateSession(params);
      setShowForm(false);
      await fetchSessionList();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleActivate(id: string) {
    setLoadingAction({ id, action: "activate" });
    try {
      await patchSession(id, "activate");
      onActiveChanged(id);
      setSelectedId(id);
      const session = sessions.find((s) => s.id === id);
      if (session) onSessionSelected(session);
      await fetchSessionList();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleEnd(id: string) {
    if (!confirm(t.confirmEnd)) return;
    setLoadingAction({ id, action: "end" });
    try {
      await patchSession(id, "end");
      onActiveChanged(null);
      if (selectedId === id) {
        setSelectedId(null);
        onSessionSelected(null);
      }
      await fetchSessionList();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleStartRehearsal(id: string) {
    setLoadingAction({ id, action: "rehearsal_start" });
    try {
      await patchSession(id, "rehearsal_start");
      setRehearsalId(id);
      onRehearsalChanged?.(id);
      setSelectedId(id);
      const session = sessions.find((s) => s.id === id);
      if (session) onSessionSelected(session);
      await fetchSessionList();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleEndRehearsal(id: string) {
    if (!confirm(t.confirmEndRehearsal)) return;
    setLoadingAction({ id, action: "rehearsal_end" });
    try {
      await patchSession(id, "rehearsal_end");
      setRehearsalId(null);
      onRehearsalChanged?.(null);
      await fetchSessionList();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.confirmDelete)) return;
    setLoadingAction({ id, action: "delete" });
    try {
      await apiDeleteSession(id);
      if (selectedId === id) {
        setSelectedId(null);
        onSessionSelected(null);
      }
      await fetchSessionList();
    } finally {
      setLoadingAction(null);
    }
  }

  function handleSelect(session: SessionInfo) {
    setSelectedId(session.id);
    onSessionSelected(session);
  }

  function getStatus(s: SessionInfo): SessionStatus {
    if (s.endedAt) return "ended";
    if (activeSessionId === s.id) return "active";
    if (rehearsalId === s.id) return "rehearsal";
    return "ready";
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー: タイトル + 作成ボタン */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{t.sessions}</h3>
        <Button size="sm" onClick={() => setShowForm(true)}>
          {t.createSession}
        </Button>
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <SessionCreateForm
          language={language}
          loading={loadingAction?.action === "create"}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* セッション一覧テーブル */}
      {initialLoading ? (
        <SessionManagerSkeleton />
      ) : (
        <SessionListTable
          language={language}
          sessions={sessions}
          selectedId={selectedId}
          userId={userId}
          userRole={userRole}
          loadingAction={loadingAction}
          getStatus={getStatus}
          onSelect={handleSelect}
          onActivate={handleActivate}
          onEnd={handleEnd}
          onStartRehearsal={handleStartRehearsal}
          onEndRehearsal={handleEndRehearsal}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
