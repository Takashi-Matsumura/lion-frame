/**
 * ハンズオンモジュール 共通型定義
 */

export type Language = "en" | "ja";

// --- Session ---

/** セッション概要（一覧・選択用） */
export interface SessionInfo {
  id: string;
  title: string;
  date: string;
  documentId: string;
  maxSeats: number;
  startedAt: string;
  endedAt: string | null;
  createdBy: string;
  creator?: { id: string; name: string | null };
  _count?: { participants: number };
}

/** アクティブ/リハーサル中のセッション（受講者向け） */
export interface AvailableSession {
  id: string;
  title: string;
  documentId: string;
  maxSeats: number;
  participantCount: number;
  startedAt: string;
  mode: "active" | "rehearsal";
}

// --- Progress ---

export type CommandStatus = "OK" | "ERROR";

export interface ParticipantInfo {
  id: string;
  displayName: string;
  seatNumber: number;
}

export interface HelpRequestInfo {
  logId: string;
  participantId: string;
  seatNumber: number;
  displayName: string;
  sectionIndex: number;
  message?: string;
  createdAt: string;
}

export interface ProgressData {
  participants: ParticipantInfo[];
  commands: Record<string, Record<number, CommandStatus>>;
  checkpoints: Record<string, number[]>;
  helpRequests: HelpRequestInfo[];
  instructorCheckpoints: number[];
}

// --- Analytics ---

export interface AnalyticsData {
  summary: {
    participantCount: number;
    durationMinutes: number;
    avgCompletionRate: number;
    totalCommands: number;
    totalErrors: number;
    totalHelpRequests: number;
  };
  participants: {
    seatNumber: number;
    displayName: string;
    commandsOk: number;
    commandsError: number;
    helpRequests: number;
    lastActivityAt: string | null;
  }[];
  errorHotspots: {
    commandIndex: number;
    errorCount: number;
    okCount: number;
  }[];
  helpBySection: {
    sectionIndex: number;
    count: number;
  }[];
  instructorTimeline: {
    commandIndex: number;
    timestamp: string;
  }[];
  rawLogs: {
    id: string;
    type: string;
    participantName: string;
    seatNumber: number | null;
    commandIndex: number | null;
    sectionIndex: number | null;
    stepId: string | null;
    status: string | null;
    createdAt: string;
  }[];
}

// --- Document ---

export interface DocOption {
  id: string;
  title: string;
}
