/**
 * ハンズオン インメモリストア
 *
 * リアルタイム進捗はglobalThisに保持し、高速な読み取りを実現。
 * 書き込み時にバックグラウンドでDBに永続化する。
 */

export type CommandStatus = "OK" | "ERROR";

export interface ParticipantInfo {
  id: string;
  displayName: string;
  seatNumber: number;
  joinedAt: Date;
}

export interface HelpRequestInfo {
  logId: string;
  participantId: string;
  seatNumber: number;
  displayName: string;
  sectionIndex: number;
  message?: string;
  createdAt: Date;
}

export interface InstructorCheckpoint {
  commandIndex: number;
  timestamp: Date;
}

interface SessionStore {
  participants: Map<number, ParticipantInfo>; // seatNumber → info
  commands: Map<string, Map<number, CommandStatus>>; // participantId → commandIndex → status
  checkpoints: Map<string, Set<number>>; // participantId → completed sectionIndexes
  helpRequests: Map<string, HelpRequestInfo>; // logId → request
  instructorCheckpoints: Map<number, InstructorCheckpoint>; // commandIndex → checkpoint
}

interface HandsonMemoryStore {
  sessions: Map<string, SessionStore>;
}

const g = globalThis as unknown as { __handsonStore?: HandsonMemoryStore };
if (!g.__handsonStore) {
  g.__handsonStore = {
    sessions: new Map(),
  };
}

const store = g.__handsonStore;

function getOrCreateSession(sessionId: string): SessionStore {
  if (!store.sessions.has(sessionId)) {
    store.sessions.set(sessionId, {
      participants: new Map(),
      commands: new Map(),
      checkpoints: new Map(),
      helpRequests: new Map(),
      instructorCheckpoints: new Map(),
    });
  }
  return store.sessions.get(sessionId)!;
}

// === 参加者管理 ===

export function addParticipant(
  sessionId: string,
  info: ParticipantInfo,
): void {
  const session = getOrCreateSession(sessionId);
  session.participants.set(info.seatNumber, info);
}

export function getParticipants(
  sessionId: string,
): Map<number, ParticipantInfo> {
  return getOrCreateSession(sessionId).participants;
}

export function removeParticipant(sessionId: string, seatNumber: number): void {
  const session = store.sessions.get(sessionId);
  if (!session) return;
  const participant = session.participants.get(seatNumber);
  if (!participant) return;
  session.participants.delete(seatNumber);
  session.commands.delete(participant.id);
  session.checkpoints.delete(participant.id);
}

export function isSeatTaken(sessionId: string, seatNumber: number): boolean {
  const session = store.sessions.get(sessionId);
  return session?.participants.has(seatNumber) ?? false;
}

// === コマンドステータス ===

export function setCommandStatus(
  sessionId: string,
  participantId: string,
  commandIndex: number,
  status: CommandStatus,
): void {
  const session = getOrCreateSession(sessionId);
  if (!session.commands.has(participantId)) {
    session.commands.set(participantId, new Map());
  }
  session.commands.get(participantId)!.set(commandIndex, status);
}

export function getCommandStatuses(
  sessionId: string,
): Map<string, Map<number, CommandStatus>> {
  return getOrCreateSession(sessionId).commands;
}

// === チェックポイント ===

export function setCheckpoint(
  sessionId: string,
  participantId: string,
  sectionIndex: number,
): void {
  const session = getOrCreateSession(sessionId);
  if (!session.checkpoints.has(participantId)) {
    session.checkpoints.set(participantId, new Set());
  }
  session.checkpoints.get(participantId)!.add(sectionIndex);
}

export function getCheckpoints(
  sessionId: string,
): Map<string, Set<number>> {
  return getOrCreateSession(sessionId).checkpoints;
}

// === ヘルプリクエスト ===

export function addHelpRequest(
  sessionId: string,
  info: HelpRequestInfo,
): void {
  const session = getOrCreateSession(sessionId);
  session.helpRequests.set(info.logId, info);
}

export function resolveHelpRequest(
  sessionId: string,
  logId: string,
): boolean {
  const session = store.sessions.get(sessionId);
  if (!session) return false;
  return session.helpRequests.delete(logId);
}

export function getActiveHelpRequests(
  sessionId: string,
): HelpRequestInfo[] {
  const session = store.sessions.get(sessionId);
  if (!session) return [];
  return Array.from(session.helpRequests.values());
}

// === セッション管理 ===

export function clearSession(sessionId: string): void {
  store.sessions.delete(sessionId);
}

export function hasSession(sessionId: string): boolean {
  return store.sessions.has(sessionId);
}

/**
 * DBからインメモリストアを復旧する
 */
export function restoreSession(
  sessionId: string,
  participants: ParticipantInfo[],
  commands: { participantId: string; commandIndex: number; status: CommandStatus }[],
  checkpoints: { participantId: string; sectionIndex: number }[],
  helpRequests: HelpRequestInfo[],
): void {
  const session = getOrCreateSession(sessionId);

  for (const p of participants) {
    session.participants.set(p.seatNumber, p);
  }

  for (const cmd of commands) {
    if (!session.commands.has(cmd.participantId)) {
      session.commands.set(cmd.participantId, new Map());
    }
    session.commands.get(cmd.participantId)!.set(cmd.commandIndex, cmd.status);
  }

  for (const cp of checkpoints) {
    if (!session.checkpoints.has(cp.participantId)) {
      session.checkpoints.set(cp.participantId, new Set());
    }
    session.checkpoints.get(cp.participantId)!.add(cp.sectionIndex);
  }

  for (const hr of helpRequests) {
    session.helpRequests.set(hr.logId, hr);
  }
}

// === 講師チェックポイント ===

export function setInstructorCheckpoint(
  sessionId: string,
  commandIndex: number,
): void {
  const session = getOrCreateSession(sessionId);
  session.instructorCheckpoints.set(commandIndex, {
    commandIndex,
    timestamp: new Date(),
  });
}

export function getInstructorCheckpoints(
  sessionId: string,
): InstructorCheckpoint[] {
  const session = store.sessions.get(sessionId);
  if (!session) return [];
  return Array.from(session.instructorCheckpoints.values()).sort(
    (a, b) => a.commandIndex - b.commandIndex,
  );
}

/**
 * 進捗マトリクスを構築
 */
export function getProgressMatrix(sessionId: string): {
  participants: ParticipantInfo[];
  commands: Record<string, Record<number, CommandStatus>>;
  checkpoints: Record<string, number[]>;
  helpRequests: HelpRequestInfo[];
  instructorCheckpoints: number[];
} {
  const session = store.sessions.get(sessionId);
  if (!session) {
    return { participants: [], commands: {}, checkpoints: {}, helpRequests: [], instructorCheckpoints: [] };
  }

  const commands: Record<string, Record<number, CommandStatus>> = {};
  for (const [pid, cmds] of session.commands) {
    commands[pid] = Object.fromEntries(cmds);
  }

  const checkpoints: Record<string, number[]> = {};
  for (const [pid, sections] of session.checkpoints) {
    checkpoints[pid] = Array.from(sections).sort((a, b) => a - b);
  }

  const instructorCheckpoints = Array.from(session.instructorCheckpoints.keys()).sort((a, b) => a - b);

  return {
    participants: Array.from(session.participants.values()),
    commands,
    checkpoints,
    helpRequests: Array.from(session.helpRequests.values()),
    instructorCheckpoints,
  };
}
