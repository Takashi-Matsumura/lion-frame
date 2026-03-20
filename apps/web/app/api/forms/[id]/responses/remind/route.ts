import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { NotificationService } from "@/lib/services/notification-service";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * POST /api/forms/[id]/responses/remind
 *
 * 未回答者にリマインド通知を送信
 * body: { userIds: string[] }  — 対象ユーザID（省略時は全未回答者）
 */
export const POST = apiHandler(
  async (request, _session) => {
    const url = new URL(request.url);
    const formId = url.pathname.split("/api/forms/")[1]?.split("/")[0];
    if (!formId) throw ApiError.badRequest("Form ID is required");

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { id: true, title: true, titleJa: true, status: true },
    });
    if (!form) throw ApiError.notFound("Form not found");
    if (form.status !== "PUBLISHED") {
      throw ApiError.badRequest("公開中のフォームのみリマインドできます");
    }

    const body = await request.json();
    let targetUserIds: string[] = body.userIds ?? [];

    // userIdsが未指定の場合、全未回答者を対象にする
    if (targetUserIds.length === 0) {
      const submissions = await prisma.formSubmission.findMany({
        where: { formId, status: "SUBMITTED" },
        select: { submittedBy: true },
      });
      const respondedIds = new Set(submissions.map((s) => s.submittedBy));

      const employees = await prisma.employee.findMany({
        where: { isActive: true, email: { not: null } },
        select: { email: true },
      });
      const emails = employees.map((e) => e.email).filter(Boolean) as string[];

      const users = await prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true },
      });
      targetUserIds = users.filter((u) => !respondedIds.has(u.id)).map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      return { sent: 0 };
    }

    const formTitle = form.titleJa || form.title;
    const result = await NotificationService.broadcast({
      userIds: targetUserIds,
      type: "ACTION",
      title: `Reminder: ${form.title}`,
      titleJa: `リマインド: ${formTitle}`,
      message: `Please respond to the form "${form.title}".`,
      messageJa: `「${formTitle}」への回答をお願いします。`,
      actionUrl: "/forms",
      actionLabel: "Respond",
      actionLabelJa: "回答する",
      source: "forms",
      sourceId: formId,
    });

    return { sent: result.count };
  },
  { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] },
);
