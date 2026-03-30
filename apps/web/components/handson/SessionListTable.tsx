"use client";

import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { handsonTranslations } from "./translations";
import type { Language, SessionInfo } from "./types";

export type SessionStatus = "active" | "ended" | "ready" | "rehearsal";

interface Props {
  language: Language;
  sessions: SessionInfo[];
  selectedId: string | null;
  userId: string;
  userRole: string;
  loadingAction: { id: string; action: string } | null;
  getStatus: (session: SessionInfo) => SessionStatus;
  onSelect: (session: SessionInfo) => void;
  onActivate: (id: string) => void;
  onEnd: (id: string) => void;
  onStartRehearsal: (id: string) => void;
  onEndRehearsal: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function SessionListTable({
  language,
  sessions,
  selectedId,
  userId,
  userRole,
  loadingAction,
  getStatus,
  onSelect,
  onActivate,
  onEnd,
  onStartRehearsal,
  onEndRehearsal,
  onDelete,
}: Props) {
  const tc = handsonTranslations[language].common;
  const t = handsonTranslations[language].sessionManager;

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

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border bg-card py-8 text-center text-sm text-muted-foreground">
        {t.noSessions}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t.date}</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t.title}</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{tc.instructor}</th>
            <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">{t.status}</th>
            <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">{tc.seats}</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => {
            const status = getStatus(s);
            const isSelected = selectedId === s.id;
            const isOwner = s.createdBy === userId || userRole === "ADMIN";
            const participantCount = s._count?.participants ?? 0;

            return (
              <tr
                key={s.id}
                onClick={() => onSelect(s)}
                className={`border-b transition cursor-pointer ${
                  isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                } ${s.endedAt ? "opacity-70" : ""}`}
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
                <td className="px-4 py-2.5 text-sm text-muted-foreground">
                  {s.creator?.name || "—"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {status === "active" && (
                    <Badge variant="default" className="bg-green-600">{tc.active}</Badge>
                  )}
                  {status === "rehearsal" && (
                    <Badge variant="default" className="bg-amber-500">{tc.rehearsal}</Badge>
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
                    {isOwner && status === "ready" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => onStartRehearsal(s.id)} loading={loadingAction?.id === s.id && loadingAction.action === "rehearsal_start"} disabled={!!loadingAction}>
                          {t.startRehearsal}
                        </Button>
                        <Button size="sm" onClick={() => onActivate(s.id)} loading={loadingAction?.id === s.id && loadingAction.action === "activate"} disabled={!!loadingAction}>
                          {t.activate}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(s.id)} loading={loadingAction?.id === s.id && loadingAction.action === "delete"} disabled={!!loadingAction}>
                          {t.delete}
                        </Button>
                      </>
                    )}
                    {isOwner && status === "rehearsal" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => onEndRehearsal(s.id)} loading={loadingAction?.id === s.id && loadingAction.action === "rehearsal_end"} disabled={!!loadingAction}>
                          {t.endRehearsal}
                        </Button>
                        <Button size="sm" onClick={() => onActivate(s.id)} loading={loadingAction?.id === s.id && loadingAction.action === "activate"} disabled={!!loadingAction}>
                          {t.activate}
                        </Button>
                      </>
                    )}
                    {isOwner && status === "active" && (
                      <Button size="sm" variant="destructive" onClick={() => onEnd(s.id)} loading={loadingAction?.id === s.id && loadingAction.action === "end"} disabled={!!loadingAction}>
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
  );
}
