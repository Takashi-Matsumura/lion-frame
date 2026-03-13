import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/kiosk/kiosk-session-service";
import type { Role } from "@prisma/client";

/**
 * PATCH /api/kiosk/events/manage/[id] — イベント更新
 */
export const PATCH = apiHandler(
  async (request) => {
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();
    if (!id) throw ApiError.badRequest("id is required", "IDは必須です");

    const body = await request.json();

    // キオスクセッション生成リクエスト
    if (body.action === "generate_kiosk") {
      const event = await prisma.kioskEvent.findUnique({ where: { id } });
      if (!event) throw ApiError.notFound("Event not found", "イベントが見つかりません");
      if (event.kioskSessionId) {
        throw ApiError.badRequest(
          "Kiosk session already exists",
          "キオスクセッションは既に作成済みです",
        );
      }

      // イベント日の終日をデフォルト有効期限に（翌日0時JST）
      const eventDate = new Date(event.date);
      const expiresAt = event.endTime
        ? new Date(event.endTime)
        : new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);

      const kioskSession = await createSession({
        name: event.name,
        moduleId: "event-attendance",
        referenceId: event.id,
        createdBy: event.createdBy,
        expiresAt,
      });

      const updated = await prisma.kioskEvent.update({
        where: { id },
        data: { kioskSessionId: kioskSession.id },
        include: {
          creator: { select: { name: true } },
          kioskSession: {
            select: {
              id: true,
              token: true,
              isActive: true,
              expiresAt: true,
              _count: { select: { attendances: true } },
            },
          },
        },
      });

      return { event: updated };
    }

    // ステータス変更
    if (body.status) {
      const updated = await prisma.kioskEvent.update({
        where: { id },
        data: { status: body.status },
        include: {
          creator: { select: { name: true } },
          kioskSession: {
            select: {
              id: true,
              token: true,
              isActive: true,
              expiresAt: true,
              _count: { select: { attendances: true } },
            },
          },
        },
      });
      return { event: updated };
    }

    // 通常更新
    const { name, nameEn, description, category, date, startTime, endTime, location, capacity } = body;
    const updated = await prisma.kioskEvent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn: nameEn || null }),
        ...(description !== undefined && { description: description || null }),
        ...(category !== undefined && { category }),
        ...(date !== undefined && { date: new Date(date + "T00:00:00+09:00") }),
        ...(startTime !== undefined && { startTime: startTime ? new Date(startTime) : null }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(location !== undefined && { location: location || null }),
        ...(capacity !== undefined && { capacity: capacity ? parseInt(capacity, 10) : null }),
      },
      include: {
        creator: { select: { name: true } },
        kioskSession: {
          select: {
            id: true,
            token: true,
            isActive: true,
            expiresAt: true,
            _count: { select: { attendances: true } },
          },
        },
      },
    });

    return { event: updated };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);

/**
 * DELETE /api/kiosk/events/manage/[id] — イベント削除
 */
export const DELETE = apiHandler(
  async (request) => {
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();
    if (!id) throw ApiError.badRequest("id is required", "IDは必須です");

    await prisma.kioskEvent.delete({ where: { id } });
    return { success: true };
  },
  { requiredRoles: ["ADMIN"] as Role[] },
);
