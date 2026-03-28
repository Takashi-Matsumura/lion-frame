/**
 * ハンズオンサービス
 *
 * セッションのCRUD、ログ記録、DB永続化を担当。
 * インメモリストアとDBの橋渡し役。
 */

import { prisma } from "@/lib/prisma";
import type { HandsonLogType } from "@prisma/client";
import * as store from "./handson-store";

// === セッション CRUD ===

export async function createSession(params: {
  title: string;
  date: string; // "YYYY-MM-DD"
  documentId: string;
  maxSeats?: number;
  createdBy: string;
}) {
  const session = await prisma.handsonSession.create({
    data: {
      title: params.title,
      date: new Date(params.date + "T00:00:00+09:00"),
      documentId: params.documentId,
      maxSeats: params.maxSeats ?? 15,
      createdBy: params.createdBy,
    },
  });

  return session;
}

export async function activateSession(id: string) {
  const session = await prisma.handsonSession.findUnique({
    where: { id },
    select: { id: true, endedAt: true },
  });
  if (!session) throw new Error("Session not found");
  if (session.endedAt) throw new Error("Cannot activate an ended session");

  await prisma.systemSetting.upsert({
    where: { key: "handson_active_session_id" },
    update: { value: id },
    create: { key: "handson_active_session_id", value: id },
  });

  return session;
}

export async function getSession(id: string) {
  return prisma.handsonSession.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { seatNumber: "asc" },
      },
    },
  });
}

export async function listSessions() {
  return prisma.handsonSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: true } },
    },
  });
}

export async function endSession(id: string) {
  const session = await prisma.handsonSession.update({
    where: { id },
    data: { endedAt: new Date() },
  });

  // アクティブセッションをクリア
  const activeSetting = await prisma.systemSetting.findUnique({
    where: { key: "handson_active_session_id" },
  });
  if (activeSetting?.value === id) {
    await prisma.systemSetting.delete({
      where: { key: "handson_active_session_id" },
    });
  }

  // インメモリストアをクリア
  store.clearSession(id);

  return session;
}

export async function deleteSession(id: string) {
  // 参加者がいない場合のみ削除可能
  const count = await prisma.handsonParticipant.count({
    where: { sessionId: id },
  });
  if (count > 0) {
    throw new Error("参加者がいるセッションは削除できません");
  }

  // アクティブセッションの場合はクリア
  const activeSetting = await prisma.systemSetting.findUnique({
    where: { key: "handson_active_session_id" },
  });
  if (activeSetting?.value === id) {
    await prisma.systemSetting.delete({
      where: { key: "handson_active_session_id" },
    });
  }

  store.clearSession(id);
  return prisma.handsonSession.delete({ where: { id } });
}

// === アクティブセッション ===

export async function getActiveSession() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "handson_active_session_id" },
  });
  if (!setting) return null;

  const session = await prisma.handsonSession.findUnique({
    where: { id: setting.value },
    include: {
      _count: { select: { participants: true } },
    },
  });

  // セッションが見つからない or 終了済みの場合はクリア
  if (!session || session.endedAt) {
    await prisma.systemSetting.delete({
      where: { key: "handson_active_session_id" },
    }).catch(() => {});
    return null;
  }

  return session;
}

// === 参加者管理 ===

export async function joinSession(params: {
  sessionId: string;
  userId?: string;
  displayName: string;
  seatNumber: number;
}) {
  const participant = await prisma.handsonParticipant.create({
    data: {
      sessionId: params.sessionId,
      userId: params.userId,
      displayName: params.displayName,
      seatNumber: params.seatNumber,
    },
  });

  // インメモリに登録
  store.addParticipant(params.sessionId, {
    id: participant.id,
    displayName: params.displayName,
    seatNumber: params.seatNumber,
    joinedAt: participant.joinedAt,
  });

  // ログ記録（非同期）
  writeLog({
    sessionId: params.sessionId,
    participantId: participant.id,
    type: "SESSION_JOIN",
  });

  return participant;
}

export async function leaveSession(sessionId: string, participantId: string) {
  const participant = await prisma.handsonParticipant.findUnique({
    where: { id: participantId },
    select: { seatNumber: true, sessionId: true },
  });
  if (!participant || participant.sessionId !== sessionId) return;

  // インメモリから除去
  store.removeParticipant(sessionId, participant.seatNumber);

  // DB削除（関連ログはCascadeで削除）
  await prisma.handsonParticipant.delete({
    where: { id: participantId },
  });
}

// === ログ記録 ===

export function writeLog(params: {
  sessionId: string;
  participantId: string;
  type: HandsonLogType | string;
  sectionIndex?: number;
  stepId?: string;
  commandIndex?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string }> {
  // 非同期でDB書き込み（awaitしない呼び出し元もある）
  return prisma.handsonLog.create({
    data: {
      sessionId: params.sessionId,
      participantId: params.participantId,
      type: params.type as HandsonLogType,
      sectionIndex: params.sectionIndex,
      stepId: params.stepId,
      commandIndex: params.commandIndex,
      status: params.status,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
    },
    select: { id: true },
  });
}

// === インメモリストア復旧 ===

export async function ensureSessionInMemory(sessionId: string): Promise<boolean> {
  if (store.hasSession(sessionId)) return true;

  const session = await prisma.handsonSession.findUnique({
    where: { id: sessionId },
    include: { participants: true },
  });
  if (!session || session.endedAt) return false;

  // 参加者復旧
  const participants: store.ParticipantInfo[] = session.participants.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    seatNumber: p.seatNumber,
    joinedAt: p.joinedAt,
  }));

  // ログからコマンド/チェックポイント/ヘルプを復旧
  const logs = await prisma.handsonLog.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  const commands: { participantId: string; commandIndex: number; status: store.CommandStatus }[] = [];
  const checkpoints: { participantId: string; sectionIndex: number }[] = [];
  const helpRequests: store.HelpRequestInfo[] = [];
  const resolvedHelps = new Set<string>();

  for (const log of logs) {
    switch (log.type) {
      case "COMMAND_OK":
      case "COMMAND_ERROR":
        if (log.commandIndex != null) {
          commands.push({
            participantId: log.participantId,
            commandIndex: log.commandIndex,
            status: log.type === "COMMAND_OK" ? "OK" : "ERROR",
          });
        }
        break;
      case "CHECKPOINT_COMPLETE":
        if (log.sectionIndex != null) {
          checkpoints.push({
            participantId: log.participantId,
            sectionIndex: log.sectionIndex,
          });
        }
        break;
      case "HELP_REQUEST": {
        const participant = session.participants.find((p) => p.id === log.participantId);
        helpRequests.push({
          logId: log.id,
          participantId: log.participantId,
          seatNumber: participant?.seatNumber ?? 0,
          displayName: participant?.displayName ?? "",
          sectionIndex: log.sectionIndex ?? 0,
          message: (log.metadata as Record<string, string> | null)?.message,
          createdAt: log.createdAt,
        });
        break;
      }
      case "HELP_RESOLVED": {
        const refId = (log.metadata as Record<string, string> | null)?.helpLogId;
        if (refId) resolvedHelps.add(refId);
        break;
      }
    }
  }

  // 解決済みヘルプを除外
  const activeHelps = helpRequests.filter((h) => !resolvedHelps.has(h.logId));

  store.restoreSession(sessionId, participants, commands, checkpoints, activeHelps);
  return true;
}
