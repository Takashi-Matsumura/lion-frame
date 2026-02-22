import { prisma } from "@/lib/prisma";
import { resolveApprovalChain } from "@/lib/services/approval-chain-service";
import { NotificationService } from "@/lib/services/notification-service";
import type { WorkflowInstanceStatus } from "@prisma/client";

/**
 * Employee→User ブリッジ: Employee.emailからUserを特定
 */
async function resolveUserByEmployeeId(
  employeeId: string,
): Promise<{ id: string; name: string | null } | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { email: true },
  });
  if (!employee?.email) return null;

  return prisma.user.findFirst({
    where: { email: employee.email },
    select: { id: true, name: true },
  });
}

/**
 * 現在のユーザーのEmployee IDを取得（PUBLISHED org内）
 */
async function resolveEmployeeIdByUserId(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return null;

  const org = await prisma.organization.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (!org) return null;

  const employee = await prisma.employee.findFirst({
    where: {
      email: user.email,
      organizationId: org.id,
      isActive: true,
    },
    select: { id: true },
  });
  return employee?.id ?? null;
}

/**
 * 承認チェーンからステップの承認者を解決
 */
async function resolveStepAssignees(
  templateStep: {
    targetType: string;
    targetConfig: unknown;
    approvalLevels: number | null;
  },
  requesterId: string,
): Promise<string[]> {
  const config = (templateStep.targetConfig as Record<string, string>) || {};

  switch (templateStep.targetType) {
    case "APPROVAL_CHAIN": {
      const employeeId = await resolveEmployeeIdByUserId(requesterId);
      if (!employeeId) return [];

      const chain = await resolveApprovalChain(employeeId);
      if (!chain) return [];

      const levels = templateStep.approvalLevels ?? chain.approvalChain.length;
      const approvers = chain.approvalChain.slice(0, levels);

      const userIds: string[] = [];
      for (const entry of approvers) {
        const user = await resolveUserByEmployeeId(entry.employee.id);
        if (user) userIds.push(user.id);
      }
      return userIds;
    }

    case "DEPARTMENT_MANAGER": {
      if (!config.departmentId) return [];
      const dept = await prisma.department.findUnique({
        where: { id: config.departmentId },
        select: { managerId: true },
      });
      if (!dept?.managerId) return [];
      const user = await resolveUserByEmployeeId(dept.managerId);
      return user ? [user.id] : [];
    }

    case "ROLE": {
      if (!config.role) return [];
      const users = await prisma.user.findMany({
        where: { role: config.role as never },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    case "SPECIFIC_USER": {
      return config.userId ? [config.userId] : [];
    }

    default:
      return [];
  }
}

/**
 * 新規申請を提出する
 */
export async function submitRequest(
  templateId: string,
  requesterId: string,
  title: string,
  formData: Record<string, string | number | boolean | null>,
): Promise<{ id: string; status: WorkflowInstanceStatus }> {
  // テンプレートとステップを取得
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
    include: {
      steps: { orderBy: { order: "asc" } },
    },
  });

  if (!template || !template.isActive) {
    throw new Error("Template not found or inactive");
  }

  // インスタンス作成
  const instance = await prisma.workflowInstance.create({
    data: {
      templateId,
      requesterId,
      status: "PENDING",
      title,
      formData,
      currentOrder: 1,
    },
  });

  // 各テンプレートステップに対してインスタンスステップを生成
  for (const tStep of template.steps) {
    const assigneeIds = await resolveStepAssignees(tStep, requesterId);

    if (assigneeIds.length === 0) {
      // 承認者なし → 自動スキップ
      await prisma.workflowInstanceStep.create({
        data: {
          instanceId: instance.id,
          templateStepId: tStep.id,
          order: tStep.order,
          status: "SKIPPED",
          actedAt: new Date(),
        },
      });
    } else {
      for (const assigneeId of assigneeIds) {
        await prisma.workflowInstanceStep.create({
          data: {
            instanceId: instance.id,
            templateStepId: tStep.id,
            order: tStep.order,
            assigneeId,
            status: tStep.order === 1 ? "PENDING" : "WAITING",
          },
        });
      }
    }
  }

  // order=1のPENDINGステップ担当者に通知
  const pendingSteps = await prisma.workflowInstanceStep.findMany({
    where: {
      instanceId: instance.id,
      order: 1,
      status: "PENDING",
    },
    select: { assigneeId: true },
  });

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { name: true },
  });

  for (const step of pendingSteps) {
    if (step.assigneeId) {
      await NotificationService.actionNotify(step.assigneeId, {
        title: `New approval request: ${title}`,
        titleJa: `新しい承認依頼: ${title}`,
        message: `${requester?.name || "Someone"} submitted a request that requires your approval.`,
        messageJa: `${requester?.name || "ユーザー"}さんから承認依頼が届きました。`,
        actionUrl: `/manager/approvals`,
        actionLabel: "Review",
        actionLabelJa: "確認する",
        source: "WORKFLOW",
        sourceId: instance.id,
      });
    }
  }

  // order=1が全てSKIPPEDの場合、次のorderへ進行
  const nonSkippedOrder1 = await prisma.workflowInstanceStep.count({
    where: {
      instanceId: instance.id,
      order: 1,
      status: { not: "SKIPPED" },
    },
  });
  if (nonSkippedOrder1 === 0) {
    await advanceWorkflow(instance.id);
  }

  const updated = await prisma.workflowInstance.findUnique({
    where: { id: instance.id },
    select: { id: true, status: true },
  });
  return updated!;
}

/**
 * ステップを処理する（承認/却下）
 */
export async function processStep(
  stepId: string,
  userId: string,
  action: "APPROVED" | "REJECTED",
  comment?: string,
): Promise<void> {
  const step = await prisma.workflowInstanceStep.findUnique({
    where: { id: stepId },
    include: {
      instance: {
        include: { requester: { select: { id: true, name: true } } },
      },
    },
  });

  if (!step) throw new Error("Step not found");
  if (step.assigneeId !== userId) throw new Error("Not authorized");
  if (step.status !== "PENDING") throw new Error("Step is not pending");

  // ステップ更新
  await prisma.workflowInstanceStep.update({
    where: { id: stepId },
    data: {
      status: action,
      comment,
      actedAt: new Date(),
    },
  });

  if (action === "REJECTED") {
    // 却下 → インスタンス全体をREJECTED、残りステップをSKIPPED
    await prisma.workflowInstance.update({
      where: { id: step.instanceId },
      data: {
        status: "REJECTED",
        completedAt: new Date(),
      },
    });

    await prisma.workflowInstanceStep.updateMany({
      where: {
        instanceId: step.instanceId,
        status: { in: ["WAITING", "PENDING"] },
      },
      data: { status: "SKIPPED" },
    });

    // 申請者に却下通知
    await NotificationService.actionNotify(step.instance.requesterId, {
      title: `Request rejected: ${step.instance.title}`,
      titleJa: `申請が却下されました: ${step.instance.title}`,
      message: comment
        ? `Your request was rejected. Reason: ${comment}`
        : "Your request was rejected.",
      messageJa: comment
        ? `申請が却下されました。理由: ${comment}`
        : "申請が却下されました。",
      actionUrl: `/requests`,
      actionLabel: "View",
      actionLabelJa: "確認する",
      source: "WORKFLOW",
      sourceId: step.instanceId,
    });
  } else {
    // 承認 → ワークフロー進行
    await advanceWorkflow(step.instanceId);
  }
}

/**
 * ワークフローを次のステップへ進行
 */
export async function advanceWorkflow(instanceId: string): Promise<void> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: {
      steps: { orderBy: { order: "asc" } },
      requester: { select: { id: true, name: true } },
    },
  });
  if (!instance) return;

  const currentOrder = instance.currentOrder;

  // 現在orderの未完了ステップ確認（SKIPPED以外）
  const pendingInCurrentOrder = instance.steps.filter(
    (s) =>
      s.order === currentOrder &&
      s.status !== "APPROVED" &&
      s.status !== "SKIPPED",
  );

  if (pendingInCurrentOrder.length > 0) {
    // まだ未完了のステップがある → ステータスをIN_PROGRESSに
    if (instance.status === "PENDING") {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: "IN_PROGRESS" },
      });
    }
    return;
  }

  // 次のorderを探す
  const allOrders = [...new Set(instance.steps.map((s) => s.order))].sort(
    (a, b) => a - b,
  );
  const currentIndex = allOrders.indexOf(currentOrder);
  const nextOrder = allOrders[currentIndex + 1];

  if (nextOrder === undefined) {
    // 最終order完了 → 承認完了
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: "APPROVED",
        completedAt: new Date(),
      },
    });

    // 申請者に承認完了通知
    await NotificationService.actionNotify(instance.requesterId, {
      title: `Request approved: ${instance.title}`,
      titleJa: `申請が承認されました: ${instance.title}`,
      message: "Your request has been approved.",
      messageJa: "申請が承認されました。",
      actionUrl: `/requests`,
      actionLabel: "View",
      actionLabelJa: "確認する",
      source: "WORKFLOW",
      sourceId: instanceId,
    });
    return;
  }

  // 次のorderへ進行
  await prisma.workflowInstance.update({
    where: { id: instanceId },
    data: {
      currentOrder: nextOrder,
      status: "IN_PROGRESS",
    },
  });

  // 次orderのステップをPENDINGに
  const nextSteps = instance.steps.filter(
    (s) => s.order === nextOrder && s.status === "WAITING",
  );
  for (const ns of nextSteps) {
    await prisma.workflowInstanceStep.update({
      where: { id: ns.id },
      data: { status: "PENDING" },
    });

    if (ns.assigneeId) {
      await NotificationService.actionNotify(ns.assigneeId, {
        title: `New approval request: ${instance.title}`,
        titleJa: `新しい承認依頼: ${instance.title}`,
        message: `${instance.requester.name || "Someone"} submitted a request that requires your approval.`,
        messageJa: `${instance.requester.name || "ユーザー"}さんから承認依頼が届きました。`,
        actionUrl: `/manager/approvals`,
        actionLabel: "Review",
        actionLabelJa: "確認する",
        source: "WORKFLOW",
        sourceId: instanceId,
      });
    }
  }

  // 次orderが全てSKIPPEDの場合、さらに進行
  const nonSkippedNext = await prisma.workflowInstanceStep.count({
    where: {
      instanceId,
      order: nextOrder,
      status: { not: "SKIPPED" },
    },
  });
  if (nonSkippedNext === 0) {
    await advanceWorkflow(instanceId);
  }
}

/**
 * 申請を取消す
 */
export async function cancelRequest(
  instanceId: string,
  userId: string,
): Promise<void> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) throw new Error("Request not found");
  if (instance.requesterId !== userId) throw new Error("Not authorized");
  if (instance.status === "APPROVED" || instance.status === "REJECTED") {
    throw new Error("Cannot cancel completed request");
  }

  await prisma.workflowInstance.update({
    where: { id: instanceId },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
    },
  });

  await prisma.workflowInstanceStep.updateMany({
    where: {
      instanceId,
      status: { in: ["WAITING", "PENDING"] },
    },
    data: { status: "SKIPPED" },
  });
}

/**
 * 自分宛の承認待ち一覧
 */
export async function getMyPendingApprovals(userId: string) {
  return prisma.workflowInstanceStep.findMany({
    where: {
      assigneeId: userId,
      status: "PENDING",
    },
    include: {
      instance: {
        include: {
          template: { select: { name: true, nameJa: true, category: true } },
          requester: { select: { id: true, name: true, email: true } },
        },
      },
      templateStep: { select: { name: true, nameJa: true, stepType: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * 自分の申請一覧
 */
export async function getMyRequests(userId: string) {
  return prisma.workflowInstance.findMany({
    where: { requesterId: userId },
    include: {
      template: { select: { name: true, nameJa: true, category: true } },
      steps: {
        include: {
          assignee: { select: { id: true, name: true } },
          templateStep: {
            select: { name: true, nameJa: true, stepType: true },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 申請詳細（申請者または承認者のみ）
 */
export async function getRequestDetail(instanceId: string, userId: string) {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: {
      template: { select: { name: true, nameJa: true, category: true } },
      requester: { select: { id: true, name: true, email: true } },
      steps: {
        include: {
          assignee: { select: { id: true, name: true } },
          templateStep: {
            select: { name: true, nameJa: true, stepType: true },
          },
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!instance) return null;

  // アクセス権チェック: 申請者または承認者
  const isRequester = instance.requesterId === userId;
  const isAssignee = instance.steps.some((s) => s.assigneeId === userId);
  if (!isRequester && !isAssignee) return null;

  return instance;
}
