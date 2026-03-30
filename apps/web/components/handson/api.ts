/**
 * ハンズオンモジュール APIクライアント
 *
 * 全 /api/handson/* エンドポイントの型付きラッパー。
 * エラー時は toast.error() でユーザーにフィードバックする。
 * ポーリング用関数（showToast=false）では通知を抑制可能。
 */

import { toast } from "sonner";
import type {
  AvailableSession,
  SessionInfo,
  ProgressData,
  HelpRequestInfo,
  AnalyticsData,
  DocOption,
} from "./types";

// --- internal helpers ---

async function request<T>(
  url: string,
  options?: RequestInit & { showToast?: boolean },
): Promise<T> {
  const { showToast = true, ...fetchOptions } = options ?? {};
  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.error || `Request failed (${res.status})`;
    if (showToast) toast.error(msg);
    throw new Error(msg);
  }
  return res.json();
}

function post<T>(url: string, body: unknown, showToast = true): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    showToast,
  });
}

function patch<T>(url: string, body: unknown, showToast = true): Promise<T> {
  return request<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    showToast,
  });
}

function del<T>(url: string, showToast = true): Promise<T> {
  return request<T>(url, { method: "DELETE", showToast });
}

// --- Session queries ---

export async function fetchActiveSessions(): Promise<{
  availableSessions: AvailableSession[];
  activeSessionId: string | null;
  rehearsalSessionId: string | null;
}> {
  return request("/api/handson/active", { showToast: false });
}

export async function fetchSessions(): Promise<SessionInfo[]> {
  const data = await request<{ sessions: SessionInfo[] }>(
    "/api/handson/sessions",
    { showToast: false },
  );
  return data.sessions;
}

export async function fetchDocument(sessionId: string): Promise<{
  document: { id: string; title: string; content: string };
}> {
  return request(`/api/handson/sessions/${sessionId}/document`, {
    showToast: false,
  });
}

export async function fetchProgress(sessionId: string): Promise<ProgressData> {
  return request(`/api/handson/sessions/${sessionId}/progress`, {
    showToast: false,
  });
}

export async function fetchHelpRequests(
  sessionId: string,
): Promise<HelpRequestInfo[]> {
  const data = await request<{ requests: HelpRequestInfo[] }>(
    `/api/handson/sessions/${sessionId}/help`,
    { showToast: false },
  );
  return data.requests || [];
}

export async function fetchAnalytics(
  sessionId: string,
): Promise<AnalyticsData> {
  return request(`/api/handson/sessions/${sessionId}/analytics`, {
    showToast: false,
  });
}

export async function fetchMyStatus(
  sessionId: string,
  participantId: string,
): Promise<{ statuses: Record<number, "ok" | "error"> }> {
  return request(
    `/api/handson/sessions/${sessionId}/my-status?participantId=${participantId}`,
    { showToast: false },
  );
}

// --- Session mutations ---

export async function createSession(params: {
  title: string;
  date: string;
  documentId: string;
  maxSeats?: number;
}): Promise<SessionInfo> {
  return post("/api/handson/sessions", params);
}

export async function patchSession(
  sessionId: string,
  action: "activate" | "end" | "rehearsal_start" | "rehearsal_end",
): Promise<{ activeSessionId?: string | null; rehearsalSessionId?: string | null }> {
  return patch(`/api/handson/sessions/${sessionId}`, { action });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await del(`/api/handson/sessions/${sessionId}`);
}

// --- Participant ---

export async function joinSession(
  sessionId: string,
  params: { seatNumber: number; displayName: string },
): Promise<{ participantId: string; seatNumber: number }> {
  return post(`/api/handson/sessions/${sessionId}/join`, params);
}

export async function leaveSession(
  sessionId: string,
  participantId: string,
): Promise<void> {
  await del(
    `/api/handson/sessions/${sessionId}/join?participantId=${participantId}`,
    false,
  );
}

// --- Logging ---

export async function postLog(
  sessionId: string,
  params: {
    participantId: string;
    type: string;
    sectionIndex?: number;
    stepId?: string;
    commandIndex?: number;
    status?: string;
    metadata?: unknown;
  },
): Promise<void> {
  await post(`/api/handson/sessions/${sessionId}/log`, params, false);
}

// --- Help ---

export async function postHelpRequest(
  sessionId: string,
  params: { participantId: string; sectionIndex?: number; message?: string },
): Promise<void> {
  await post(`/api/handson/sessions/${sessionId}/help`, params, false);
}

export async function resolveHelpRequest(
  sessionId: string,
  logId: string,
): Promise<void> {
  await del(`/api/handson/sessions/${sessionId}/help?logId=${logId}`, false);
}

// --- Documents (for session creation form) ---

export async function fetchPublishedDocuments(): Promise<DocOption[]> {
  const data = await request<{
    documents: Array<{ id: string; title: string; status: string; type: string }>;
  }>("/api/editor?scope=all", { showToast: false });
  return (data.documents || [])
    .filter((d) => d.status === "PUBLISHED" && d.type === "markdown")
    .map((d) => ({ id: d.id, title: d.title }));
}
