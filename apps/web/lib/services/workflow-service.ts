import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";
import { NotificationService } from "./notification-service";

/**
 * ワークフロー（申請・承認）サービス
 *
 * supervisorIdチェーンを利用した承認ルート自動構築、
 * 代行者（deputyId）対応の承認判定を提供する。
 */
export class WorkflowService {
  /**
   * User.email → Employee を取得
   */
  static async getEmployeeByEmail(email: string) {
    const employee = await prisma.employee.findUnique({
      where: { email },
      include: { department: true, section: true, course: true },
    });
    return employee;
  }

  /**
   * 承認ルート構築 — supervisorIdチェーンをN段辿る
   * @returns 承認者Employeeの配列（step1, step2, ...）
   */
  static async buildApprovalChain(
    requesterId: string,
    totalSteps: number,
  ): Promise<{ id: string; name: string; email: string | null }[]> {
    const chain: { id: string; name: string; email: string | null }[] = [];
    let currentId = requesterId;

    for (let i = 0; i < totalSteps; i++) {
      const current = await prisma.employee.findUnique({
        where: { id: currentId },
        select: { supervisorId: true },
      });

      if (!current?.supervisorId) break;

      const supervisor = await prisma.employee.findUnique({
        where: { id: current.supervisorId },
        select: { id: true, name: true, email: true },
      });

      if (!supervisor) break;

      chain.push(supervisor);
      currentId = supervisor.id;
    }

    return chain;
  }

  /**
   * 申請番号を生成 — WF-YYYYMM-NNNN
   */
  static async generateRequestNumber(): Promise<string> {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `WF-${ym}-`;

    const last = await prisma.workflowRequest.findFirst({
      where: { requestNumber: { startsWith: prefix } },
      orderBy: { requestNumber: "desc" },
      select: { requestNumber: true },
    });

    const seq = last
      ? Number.parseInt(last.requestNumber.slice(prefix.length), 10) + 1
      : 1;

    return `${prefix}${String(seq).padStart(4, "0")}`;
  }

  /**
   * 下書き作成
   */
  static async createDraft(
    requesterId: string,
    templateId: string,
    title: string,
    formData: Prisma.InputJsonValue,
  ) {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new Error("Template not found");

    const requestNumber = await this.generateRequestNumber();

    return prisma.workflowRequest.create({
      data: {
        requestNumber,
        templateId,
        requesterId,
        title,
        formData,
        status: "draft",
        currentStep: 0,
        totalSteps: template.approvalSteps,
      },
      include: {
        template: true,
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        approvals: { include: { approver: { select: { id: true, name: true } }, decidedBy: { select: { id: true, name: true } } }, orderBy: { step: "asc" } },
      },
    });
  }

  /**
   * 下書き更新
   */
  static async updateDraft(
    requestId: string,
    requesterId: string,
    data: { title?: string; formData?: Prisma.InputJsonValue; templateId?: string },
  ) {
    const request = await prisma.workflowRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new Error("Request not found");
    if (request.requesterId !== requesterId) throw new Error("Not the requester");
    if (request.status !== "draft") throw new Error("Only draft requests can be updated");

    const updateData: Record<string, unknown> = {};
    if (data.title) updateData.title = data.title;
    if (data.formData) updateData.formData = data.formData;

    if (data.templateId && data.templateId !== request.templateId) {
      const template = await prisma.workflowTemplate.findUnique({
        where: { id: data.templateId },
      });
      if (!template) throw new Error("Template not found");
      updateData.templateId = data.templateId;
      updateData.totalSteps = template.approvalSteps;
    }

    return prisma.workflowRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        template: true,
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        approvals: { include: { approver: { select: { id: true, name: true } }, decidedBy: { select: { id: true, name: true } } }, orderBy: { step: "asc" } },
      },
    });
  }

  /**
   * 申請を提出 — 承認ルート構築 + Step1承認者に通知
   */
  static async submit(
    requestId: string,
    requesterId: string,
    userId?: string,
  ) {
    const request = await prisma.workflowRequest.findUnique({
      where: { id: requestId },
      include: { template: true, requester: true },
    });
    if (!request) throw new Error("Request not found");
    if (request.requesterId !== requesterId) throw new Error("Not the requester");
    if (request.status !== "draft") throw new Error("Only draft requests can be submitted");

    // 承認ルート構築
    const chain = await this.buildApprovalChain(requesterId, request.totalSteps);
    if (chain.length === 0) {
      throw new Error("No approval chain found. Please ensure a supervisor is assigned.");
    }

    // 承認レコード生成
    const approvalData = chain.map((approver, i) => ({
      requestId,
      step: i + 1,
      approverId: approver.id,
      status: "pending",
    }));

    await prisma.workflowApproval.createMany({ data: approvalData });

    // ステータス更新
    const updated = await prisma.workflowRequest.update({
      where: { id: requestId },
      data: {
        status: "pending",
        currentStep: 1,
        totalSteps: chain.length,
        submittedAt: new Date(),
      },
      include: {
        template: true,
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        approvals: { include: { approver: { select: { id: true, name: true } }, decidedBy: { select: { id: true, name: true } } }, orderBy: { step: "asc" } },
      },
    });

    // Step1承認者（＋代行者）に通知
    const firstApprover = chain[0];
    await this.notifyApprover(firstApprover, request.requester.name, updated.requestNumber, request.title);

    // 代行者にも通知
    const approverWithDeputy = await prisma.employee.findUnique({
      where: { id: firstApprover.id },
      select: { deputyId: true, deputy: { select: { id: true, email: true } } },
    });
    if (approverWithDeputy?.deputy?.email) {
      const deputyUser = await prisma.user.findUnique({
        where: { email: approverWithDeputy.deputy.email },
        select: { id: true },
      });
      if (deputyUser) {
        await NotificationService.actionNotify(deputyUser.id, {
          title: `New approval request (as deputy): ${updated.requestNumber}`,
          titleJa: `新しい承認依頼（代行）: ${updated.requestNumber}`,
          message: `${request.requester.name} submitted "${request.title}"`,
          messageJa: `${request.requester.name}さんが「${request.title}」を提出しました`,
          actionUrl: "/workflow-approvals",
          actionLabel: "Review",
          actionLabelJa: "確認",
          source: "WORKFLOW",
          sourceId: requestId,
        });
      }
    }

    // 監査ログ
    await AuditService.log({
      action: "WORKFLOW_SUBMIT",
      category: "WORKFLOW",
      userId,
      targetId: requestId,
      targetType: "WorkflowRequest",
      details: {
        requestNumber: updated.requestNumber,
        templateType: updated.template.type,
        title: request.title,
        totalSteps: chain.length,
        approvers: chain.map((a) => a.name),
      },
    });

    return updated;
  }

  /**
   * 申請を取り下げ
   */
  static async cancel(requestId: string, requesterId: string, userId?: string) {
    const request = await prisma.workflowRequest.findUnique({
      where: { id: requestId },
      include: { template: true },
    });
    if (!request) throw new Error("Request not found");
    if (request.requesterId !== requesterId) throw new Error("Not the requester");
    if (request.status !== "pending" && request.status !== "draft") {
      throw new Error("Only pending or draft requests can be cancelled");
    }

    // 未決定の承認レコードをskipに
    await prisma.workflowApproval.updateMany({
      where: { requestId, status: "pending" },
      data: { status: "skipped" },
    });

    const updated = await prisma.workflowRequest.update({
      where: { id: requestId },
      data: { status: "cancelled", completedAt: new Date() },
      include: {
        template: true,
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        approvals: { include: { approver: { select: { id: true, name: true } }, decidedBy: { select: { id: true, name: true } } }, orderBy: { step: "asc" } },
      },
    });

    await AuditService.log({
      action: "WORKFLOW_CANCEL",
      category: "WORKFLOW",
      userId,
      targetId: requestId,
      targetType: "WorkflowRequest",
      details: { requestNumber: updated.requestNumber, templateType: updated.template.type },
    });

    return updated;
  }

  /**
   * 承認権限チェック — 本人 or 代行者
   */
  static async canApprove(
    requestId: string,
    employeeId: string,
  ): Promise<{ canApprove: boolean; approval?: { id: string; step: number; approverId: string }; isDeputy: boolean }> {
    // 本人が承認者
    const directApproval = await prisma.workflowApproval.findFirst({
      where: { requestId, approverId: employeeId, status: "pending" },
      select: { id: true, step: true, approverId: true },
    });

    if (directApproval) {
      // 現在のステップと一致するか確認
      const request = await prisma.workflowRequest.findUnique({
        where: { id: requestId },
        select: { currentStep: true, status: true },
      });
      if (request?.status === "pending" && directApproval.step === request.currentStep) {
        return { canApprove: true, approval: directApproval, isDeputy: false };
      }
    }

    // 代行者チェック — employeeIdがいずれかの承認者のdeputyか
    const deputyFor = await prisma.employee.findMany({
      where: { deputyId: employeeId },
      select: { id: true },
    });

    for (const principal of deputyFor) {
      const deputyApproval = await prisma.workflowApproval.findFirst({
        where: { requestId, approverId: principal.id, status: "pending" },
        select: { id: true, step: true, approverId: true },
      });
      if (deputyApproval) {
        const request = await prisma.workflowRequest.findUnique({
          where: { id: requestId },
          select: { currentStep: true, status: true },
        });
        if (request?.status === "pending" && deputyApproval.step === request.currentStep) {
          return { canApprove: true, approval: deputyApproval, isDeputy: true };
        }
      }
    }

    return { canApprove: false, isDeputy: false };
  }

  /**
   * 承認
   */
  static async approve(
    requestId: string,
    employeeId: string,
    userId?: string,
    comment?: string,
  ) {
    const check = await this.canApprove(requestId, employeeId);
    if (!check.canApprove || !check.approval) {
      throw new Error("You are not authorized to approve this request");
    }

    // 承認レコード更新
    await prisma.workflowApproval.update({
      where: { id: check.approval.id },
      data: {
        status: "approved",
        decidedById: employeeId,
        comment,
        decidedAt: new Date(),
      },
    });

    const request = await prisma.workflowRequest.findUnique({
      where: { id: requestId },
      include: { template: true, requester: true },
    });
    if (!request) throw new Error("Request not found");

    const nextStep = request.currentStep + 1;
    const isComplete = nextStep > request.totalSteps;

    if (isComplete) {
      // 最終承認 → 完了
      const updated = await prisma.workflowRequest.update({
        where: { id: requestId },
        data: { status: "approved", completedAt: new Date(), currentStep: request.totalSteps },
        include: {
          template: true,
          requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
          approvals: { include: { approver: { select: { id: true, name: true } }, decidedBy: { select: { id: true, name: true } } }, orderBy: { step: "asc" } },
        },
      });

      // 申請者に承認完了通知
      if (request.requester.email) {
        const requesterUser = await prisma.user.findUnique({
          where: { email: request.requester.email },
          select: { id: true },
        });
        if (requesterUser) {
          await NotificationService.actionNotify(requesterUser.id, {
            title: `Request approved: ${updated.requestNumber}`,
            titleJa: `申請が承認されました: ${updated.requestNumber}`,
            message: `"${request.title}" has been fully approved.`,
            messageJa: `「${request.title}」が承認されました。`,
            actionUrl: "/workflow",
            actionLabel: "View",
            actionLabelJa: "確認",
            source: "WORKFLOW",
            sourceId: requestId,
          });
        }
      }

      await AuditService.log({
        action: "WORKFLOW_APPROVE",
        category: "WORKFLOW",
        userId,
        targetId: requestId,
        targetType: "WorkflowRequest",
        details: {
          requestNumber: updated.requestNumber,
          step: check.approval.step,
          isDeputy: check.isDeputy,
          isFinalApproval: true,
          comment,
        },
      });

      return updated;
    }

    // 次のステップへ
    const updated = await prisma.workflowRequest.update({
      where: { id: requestId },
      data: { currentStep: nextStep },
      include: {
        template: true,
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        approvals: { include: { approver: { select: { id: true, name: true } }, decidedBy: { select: { id: true, name: true } } }, orderBy: { step: "asc" } },
      },
    });

    // 次の承認者に通知
    const nextApproval = await prisma.workflowApproval.findUnique({
      where: { requestId_step: { requestId, step: nextStep } },
      include: { approver: { select: { id: true, name: true, email: true } } },
    });
    if (nextApproval) {
      await this.notifyApprover(
        nextApproval.approver,
        request.requester.name,
        updated.requestNumber,
        request.title,
      );
    }

    await AuditService.log({
      action: "WORKFLOW_APPROVE",
      category: "WORKFLOW",
      userId,
      targetId: requestId,
      targetType: "WorkflowRequest",
      details: {
        requestNumber: updated.requestNumber,
        step: check.approval.step,
        isDeputy: check.isDeputy,
        isFinalApproval: false,
        nextStep,
        comment,
      },
    });

    return updated;
  }

  /**
   * 却下
   */
  static async reject(
    requestId: string,
    employeeId: string,
    userId?: string,
    comment?: string,
  ) {
    const check = await this.canApprove(requestId, employeeId);
    if (!check.canApprove || !check.approval) {
      throw new Error("You are not authorized to reject this request");
    }

    // 承認レコード更新
    await prisma.workflowApproval.update({
      where: { id: check.approval.id },
      data: {
        status: "rejected",
        decidedById: employeeId,
        comment,
        decidedAt: new Date(),
      },
    });

    // 後続ステップをskip
    await prisma.workflowApproval.updateMany({
      where: { requestId, step: { gt: check.approval.step }, status: "pending" },
      data: { status: "skipped" },
    });

    const updated = await prisma.workflowRequest.update({
      where: { id: requestId },
      data: { status: "rejected", completedAt: new Date() },
      include: {
        template: true,
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        approvals: { include: { approver: { select: { id: true, name: true } }, decidedBy: { select: { id: true, name: true } } }, orderBy: { step: "asc" } },
      },
    });

    // 申請者に却下通知
    const request = await prisma.workflowRequest.findUnique({
      where: { id: requestId },
      include: { requester: true },
    });
    if (request?.requester.email) {
      const requesterUser = await prisma.user.findUnique({
        where: { email: request.requester.email },
        select: { id: true },
      });
      if (requesterUser) {
        await NotificationService.actionNotify(requesterUser.id, {
          title: `Request rejected: ${updated.requestNumber}`,
          titleJa: `申請が却下されました: ${updated.requestNumber}`,
          message: comment
            ? `"${updated.title}" was rejected. Comment: ${comment}`
            : `"${updated.title}" was rejected.`,
          messageJa: comment
            ? `「${updated.title}」が却下されました。コメント: ${comment}`
            : `「${updated.title}」が却下されました。`,
          actionUrl: "/workflow",
          actionLabel: "View",
          actionLabelJa: "確認",
          source: "WORKFLOW",
          sourceId: requestId,
        });
      }
    }

    await AuditService.log({
      action: "WORKFLOW_REJECT",
      category: "WORKFLOW",
      userId,
      targetId: requestId,
      targetType: "WorkflowRequest",
      details: {
        requestNumber: updated.requestNumber,
        step: check.approval.step,
        isDeputy: check.isDeputy,
        comment,
      },
    });

    return updated;
  }

  /**
   * 自分の申請一覧
   */
  static async getMyRequests(
    requesterId: string,
    filter?: { status?: string },
  ) {
    const where: Record<string, unknown> = { requesterId };
    if (filter?.status && filter.status !== "all") {
      where.status = filter.status;
    }

    return prisma.workflowRequest.findMany({
      where,
      include: {
        template: true,
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        approvals: {
          include: {
            approver: { select: { id: true, name: true } },
            decidedBy: { select: { id: true, name: true } },
          },
          orderBy: { step: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 承認待ち一覧 — 本人 or 代行者
   */
  static async getPendingApprovals(employeeId: string) {
    // 本人が承認者のもの
    const directApprovals = await prisma.workflowApproval.findMany({
      where: { approverId: employeeId, status: "pending" },
      select: { requestId: true, step: true },
    });

    // 代行者として承認可能なもの
    const deputyFor = await prisma.employee.findMany({
      where: { deputyId: employeeId },
      select: { id: true },
    });
    const deputyApprovals = await prisma.workflowApproval.findMany({
      where: {
        approverId: { in: deputyFor.map((d) => d.id) },
        status: "pending",
      },
      select: { requestId: true, step: true },
    });

    const allRequestIds = [
      ...new Set([
        ...directApprovals.map((a) => a.requestId),
        ...deputyApprovals.map((a) => a.requestId),
      ]),
    ];

    if (allRequestIds.length === 0) return [];

    // currentStepと一致するもののみ返す
    const requests = await prisma.workflowRequest.findMany({
      where: {
        id: { in: allRequestIds },
        status: "pending",
      },
      include: {
        template: true,
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        approvals: {
          include: {
            approver: { select: { id: true, name: true } },
            decidedBy: { select: { id: true, name: true } },
          },
          orderBy: { step: "asc" },
        },
      },
      orderBy: { submittedAt: "asc" },
    });

    // currentStepの承認レコードが該当者のものだけ返す
    const allApprovalMap = new Map<string, number>();
    for (const a of [...directApprovals, ...deputyApprovals]) {
      allApprovalMap.set(a.requestId, a.step);
    }

    return requests.filter((r) => {
      const step = allApprovalMap.get(r.id);
      return step === r.currentStep;
    });
  }

  /**
   * 承認履歴
   */
  static async getApprovalHistory(employeeId: string) {
    return prisma.workflowApproval.findMany({
      where: {
        OR: [
          { decidedById: employeeId },
          { approverId: employeeId, status: { in: ["approved", "rejected"] } },
        ],
      },
      include: {
        request: {
          include: {
            template: true,
            requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
          },
        },
        approver: { select: { id: true, name: true } },
        decidedBy: { select: { id: true, name: true } },
      },
      orderBy: { decidedAt: "desc" },
    });
  }

  /**
   * 申請詳細取得
   */
  static async getRequest(requestId: string) {
    return prisma.workflowRequest.findUnique({
      where: { id: requestId },
      include: {
        template: true,
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        approvals: {
          include: {
            approver: { select: { id: true, name: true } },
            decidedBy: { select: { id: true, name: true } },
          },
          orderBy: { step: "asc" },
        },
      },
    });
  }

  /**
   * 承認者に通知を送信するヘルパー
   */
  private static async notifyApprover(
    approver: { id: string; name: string; email: string | null },
    requesterName: string,
    requestNumber: string,
    requestTitle: string,
  ) {
    if (!approver.email) return;

    const approverUser = await prisma.user.findUnique({
      where: { email: approver.email },
      select: { id: true },
    });
    if (!approverUser) return;

    await NotificationService.actionNotify(approverUser.id, {
      title: `New approval request: ${requestNumber}`,
      titleJa: `新しい承認依頼: ${requestNumber}`,
      message: `${requesterName} submitted "${requestTitle}"`,
      messageJa: `${requesterName}さんが「${requestTitle}」を提出しました`,
      actionUrl: "/workflow-approvals",
      actionLabel: "Review",
      actionLabelJa: "確認",
      source: "WORKFLOW",
      sourceId: requestNumber,
    });
  }
}
