import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { FormsService } from "@/lib/addon-modules/forms/forms-service";
import { NotificationService } from "@/lib/services/notification-service";
import type { Role } from "@prisma/client";

export const POST = apiHandler(async (request, _session) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/api/forms/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Form ID is required");

  try {
    const result = await FormsService.unpublishForm(id);
    if (!result) throw ApiError.notFound("Form not found", "フォームが見つかりません");

    const { form, respondedUserIds } = result;

    // 回答済みユーザに再回答依頼の通知を送信
    if (respondedUserIds.length > 0) {
      const formTitle = form.titleJa || form.title;
      await NotificationService.broadcast({
        userIds: respondedUserIds,
        type: "ACTION",
        title: `Form updated: ${form.title}`,
        titleJa: `フォーム修正: ${formTitle}`,
        message: `The form "${form.title}" has been updated. Your previous response has been reset. Please respond again when the form is republished.`,
        messageJa: `「${formTitle}」が修正のため公開解除されました。以前の回答はリセットされています。再公開後に改めて回答をお願いします。`,
        actionUrl: "/forms",
        actionLabel: "View forms",
        actionLabelJa: "フォームを確認",
        source: "forms",
        sourceId: id,
      });
    }

    return {
      form,
      deletedResponses: respondedUserIds.length,
      notifiedUsers: respondedUserIds.length,
    };
  } catch (e) {
    throw ApiError.badRequest(
      (e as Error).message,
      (e as Error).message,
    );
  }
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });
