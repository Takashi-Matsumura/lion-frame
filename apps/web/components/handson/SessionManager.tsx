"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";

const translations = {
  en: {
    createSession: "Create Session",
    sessionTitle: "Session Title",
    sessionDate: "Date",
    selectDocument: "Select Document",
    maxSeats: "Max Seats",
    create: "Create",
    cancel: "Cancel",
    noDocuments: "No published documents found. Create and publish a document in the Editor first.",
    titlePlaceholder: "e.g. Git Hands-on Day 1",
    active: "Active",
    ended: "Ended",
    ready: "Ready",
    activate: "Start",
    end: "End",
    delete: "Delete",
    confirmEnd: "Are you sure you want to end this session?",
    confirmDelete: "Are you sure you want to delete this session?",
    noSessions: "No sessions yet. Create one to get started.",
    sessions: "Sessions",
    date: "Date",
    title: "Title",
    status: "Status",
    seats: "Seats",
    actions: "Actions",
    participants: "participants",
  },
  ja: {
    createSession: "セッション作成",
    sessionTitle: "セッション名",
    sessionDate: "開催日",
    selectDocument: "教材ドキュメント",
    maxSeats: "最大座席数",
    create: "作成",
    cancel: "キャンセル",
    noDocuments: "公開済みドキュメントがありません。先にエディタでドキュメントを作成・公開してください。",
    titlePlaceholder: "例: Git ハンズオン Day 1",
    active: "開催中",
    ended: "終了",
    ready: "準備中",
    activate: "開始",
    end: "終了",
    delete: "削除",
    confirmEnd: "このセッションを終了しますか？",
    confirmDelete: "このセッションを削除しますか？",
    noSessions: "セッションがありません。作成してください。",
    sessions: "セッション",
    date: "開催日",
    title: "セッション名",
    status: "状態",
    seats: "座席数",
    actions: "操作",
    participants: "名参加",
  },
};

interface DocOption {
  id: string;
  title: string;
}

interface SessionInfo {
  id: string;
  title: string;
  date: string;
  documentId: string;
  maxSeats: number;
  startedAt: string;
  endedAt: string | null;
  _count?: { participants: number };
}

interface Props {
  language: "en" | "ja";
  activeSessionId: string | null;
  onSessionSelected: (session: SessionInfo | null) => void;
  onActiveChanged: (activeId: string | null) => void;
}

export default function SessionManager({
  language,
  activeSessionId,
  onSessionSelected,
  onActiveChanged,
}: Props) {
  const t = translations[language];
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [documents, setDocuments] = useState<DocOption[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }),
  );
  const [documentId, setDocumentId] = useState("");
  const [maxSeats, setMaxSeats] = useState(15);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(activeSessionId);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/handson/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (showForm) fetchDocuments();
  }, [showForm]);

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/editor?scope=all");
      const data = await res.json();
      const published = (data.documents || []).filter(
        (d: { status: string; type: string }) => d.status === "PUBLISHED" && d.type === "markdown",
      );
      setDocuments(published.map((d: { id: string; title: string }) => ({ id: d.id, title: d.title })));
    } catch {
      // ignore
    }
  }

  async function handleCreate() {
    if (!title.trim() || !date || !documentId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/handson/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), date, documentId, maxSeats }),
      });
      if (res.ok) {
        setShowForm(false);
        setTitle("");
        setDate(new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }));
        setDocumentId("");
        setMaxSeats(15);
        await fetchSessions();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/handson/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
      if (res.ok) {
        onActiveChanged(id);
        setSelectedId(id);
        const session = sessions.find((s) => s.id === id);
        if (session) onSessionSelected(session);
        await fetchSessions();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd(id: string) {
    if (!confirm(t.confirmEnd)) return;
    setLoading(true);
    try {
      await fetch(`/api/handson/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
      onActiveChanged(null);
      if (selectedId === id) {
        setSelectedId(null);
        onSessionSelected(null);
      }
      await fetchSessions();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.confirmDelete)) return;
    setLoading(true);
    try {
      await fetch(`/api/handson/sessions/${id}`, { method: "DELETE" });
      if (selectedId === id) {
        setSelectedId(null);
        onSessionSelected(null);
      }
      await fetchSessions();
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(session: SessionInfo) {
    setSelectedId(session.id);
    onSessionSelected(session);
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Tokyo",
      });
    } catch {
      return dateStr;
    }
  }

  function getStatus(s: SessionInfo): "active" | "ended" | "ready" {
    if (s.endedAt) return "ended";
    if (activeSessionId === s.id) return "active";
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
        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">{t.sessionTitle}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titlePlaceholder}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">{t.sessionDate}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">{t.maxSeats}</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxSeats}
                  onChange={(e) => setMaxSeats(parseInt(e.target.value, 10) || 15)}
                  className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">{t.selectDocument}</label>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.noDocuments}</p>
              ) : (
                <select
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">---</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.title}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={handleCreate} disabled={loading || !title.trim() || !date || !documentId}>
              {t.create}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      )}

      {/* セッション一覧テーブル */}
      {sessions.length === 0 ? (
        <div className="rounded-lg border bg-card py-8 text-center text-sm text-muted-foreground">
          {t.noSessions}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t.date}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t.title}</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">{t.status}</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">{t.seats}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const status = getStatus(s);
                const isSelected = selectedId === s.id;
                const participantCount = s._count?.participants ?? 0;

                return (
                  <tr
                    key={s.id}
                    onClick={() => !s.endedAt && handleSelect(s)}
                    className={`border-b transition cursor-pointer ${
                      isSelected
                        ? "bg-primary/5"
                        : "hover:bg-muted/30"
                    } ${s.endedAt ? "opacity-60 cursor-default" : ""}`}
                  >
                    <td className="px-4 py-2.5 text-foreground">{formatDate(s.date)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{s.title}</span>
                        {participantCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({participantCount}{t.participants})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {status === "active" && (
                        <Badge variant="default" className="bg-green-600">{t.active}</Badge>
                      )}
                      {status === "ended" && (
                        <Badge variant="secondary">{t.ended}</Badge>
                      )}
                      {status === "ready" && (
                        <Badge variant="outline">{t.ready}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{s.maxSeats}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {status === "ready" && (
                          <>
                            <Button size="sm" onClick={() => handleActivate(s.id)} disabled={loading}>
                              {t.activate}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)} disabled={loading}>
                              {t.delete}
                            </Button>
                          </>
                        )}
                        {status === "active" && (
                          <Button size="sm" variant="destructive" onClick={() => handleEnd(s.id)} disabled={loading}>
                            {t.end}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
