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
      case "INSTRUCTOR_CHECKPOINT":
        if (log.commandIndex != null) {
          store.setInstructorCheckpoint(sessionId, log.commandIndex);
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

// === セッション分析 ===

export async function getSessionAnalytics(sessionId: string) {
  const session = await prisma.handsonSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: { orderBy: { seatNumber: "asc" } },
    },
  });
  if (!session) throw new Error("Session not found");

  const logs = await prisma.handsonLog.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  // 参加者マップ
  const participantMap = new Map(
    session.participants.map((p) => [p.id, p]),
  );

  // 集計用
  const perParticipant: Record<string, {
    commandsOk: number;
    commandsError: number;
    helpRequests: number;
    lastActivityAt: Date | null;
  }> = {};
  const commandErrors: Record<number, { errors: number; oks: number }> = {};
  const helpBySection: Record<number, number> = {};
  const instructorTimeline: { commandIndex: number; timestamp: string }[] = [];
  let totalCommands = 0;

  for (const p of session.participants) {
    perParticipant[p.id] = { commandsOk: 0, commandsError: 0, helpRequests: 0, lastActivityAt: null };
  }

  for (const log of logs) {
    // 参加者の最終アクティビティ更新
    if (log.participantId !== "system" && log.participantId !== "instructor" && perParticipant[log.participantId]) {
      perParticipant[log.participantId].lastActivityAt = log.createdAt;
    }

    switch (log.type) {
      case "COMMAND_OK":
        if (perParticipant[log.participantId]) {
          perParticipant[log.participantId].commandsOk++;
        }
        if (log.commandIndex != null) {
          if (!commandErrors[log.commandIndex]) commandErrors[log.commandIndex] = { errors: 0, oks: 0 };
          commandErrors[log.commandIndex].oks++;
          if (log.commandIndex + 1 > totalCommands) totalCommands = log.commandIndex + 1;
        }
        break;
      case "COMMAND_ERROR":
        if (perParticipant[log.participantId]) {
          perParticipant[log.participantId].commandsError++;
        }
        if (log.commandIndex != null) {
          if (!commandErrors[log.commandIndex]) commandErrors[log.commandIndex] = { errors: 0, oks: 0 };
          commandErrors[log.commandIndex].errors++;
          if (log.commandIndex + 1 > totalCommands) totalCommands = log.commandIndex + 1;
        }
        break;
      case "HELP_REQUEST":
        if (perParticipant[log.participantId]) {
          perParticipant[log.participantId].helpRequests++;
        }
        if (log.sectionIndex != null) {
          helpBySection[log.sectionIndex] = (helpBySection[log.sectionIndex] || 0) + 1;
        }
        break;
      case "INSTRUCTOR_CHECKPOINT":
        if (log.commandIndex != null) {
          instructorTimeline.push({
            commandIndex: log.commandIndex,
            timestamp: log.createdAt.toISOString(),
          });
        }
        break;
    }
  }

  // 所要時間
  const durationMinutes = session.endedAt
    ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000)
    : 0;

  // 受講者別データ
  const participants = session.participants.map((p) => {
    const stats = perParticipant[p.id] || { commandsOk: 0, commandsError: 0, helpRequests: 0, lastActivityAt: null };
    return {
      seatNumber: p.seatNumber,
      displayName: p.displayName,
      commandsOk: stats.commandsOk,
      commandsError: stats.commandsError,
      helpRequests: stats.helpRequests,
      lastActivityAt: stats.lastActivityAt?.toISOString() ?? null,
    };
  });

  // エラーホットスポット（上位10件）
  const errorHotspots = Object.entries(commandErrors)
    .filter(([, v]) => v.errors > 0)
    .sort(([, a], [, b]) => b.errors - a.errors)
    .slice(0, 10)
    .map(([idx, v]) => ({
      commandIndex: parseInt(idx, 10),
      errorCount: v.errors,
      okCount: v.oks,
    }));

  // セクション別ヘルプ
  const helpBySectionArray = Object.entries(helpBySection)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([idx, count]) => ({
      sectionIndex: parseInt(idx, 10),
      count,
    }));

  // 平均完了率
  const participantCount = session.participants.length;
  const avgCompletionRate = participantCount > 0 && totalCommands > 0
    ? Math.round(
        participants.reduce((sum, p) => sum + p.commandsOk, 0) /
        (participantCount * totalCommands) * 100
      )
    : 0;

  const totalErrors = participants.reduce((sum, p) => sum + p.commandsError, 0);
  const totalHelpRequests = participants.reduce((sum, p) => sum + p.helpRequests, 0);

  return {
    summary: {
      participantCount,
      durationMinutes,
      avgCompletionRate,
      totalCommands,
      totalErrors,
      totalHelpRequests,
    },
    participants,
    errorHotspots,
    helpBySection: helpBySectionArray,
    instructorTimeline,
  };
}
