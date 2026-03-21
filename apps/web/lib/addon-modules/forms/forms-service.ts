/**
 * フォームサービス
 * フォームのCRUD、公開、回答管理
 */

import type { FieldType, FormStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateConditions, type ConditionalLogic } from "./condition-evaluator";

// ─── Types ───

interface FieldInput {
  id?: string;
  type: FieldType;
  label: string;
  labelJa?: string;
  placeholder?: string;
  required?: boolean;
  order: number;
  config?: Record<string, unknown>;
  conditionalLogic?: ConditionalLogic | null;
}

interface SectionInput {
  id?: string;
  title?: string;
  titleJa?: string;
  description?: string;
  order: number;
  conditionalLogic?: ConditionalLogic | null;
  fields: FieldInput[];
}

interface FormInput {
  title: string;
  titleJa?: string;
  description?: string;
  descriptionJa?: string;
  allowMultiple?: boolean;
  settings?: Record<string, unknown>;
  sections: SectionInput[];
}

interface AnswerInput {
  fieldId: string;
  value: unknown;
}

const isPersistedId = (id?: string | null) => id != null && !id.startsWith("temp_");

// ─── Helpers ───

const formInclude = {
  sections: {
    include: { fields: { orderBy: { order: "asc" as const } } },
    orderBy: { order: "asc" as const },
  },
  creator: { select: { id: true, name: true, email: true } },
  _count: { select: { submissions: { where: { status: "SUBMITTED" } } } },
} satisfies Prisma.FormInclude;

// ─── Service ───

export const FormsService = {
  /**
   * フォーム一覧取得
   * USER: PUBLISHED のみ
   * MANAGER+: 自分が作成した全ステータス + PUBLISHED
   */
  async listForms(userId: string, role: Role) {
    const isManager = ["MANAGER", "EXECUTIVE", "ADMIN"].includes(role);

    const where: Prisma.FormWhereInput = isManager
      ? { OR: [{ createdBy: userId }, { status: "PUBLISHED" }] }
      : { status: "PUBLISHED" };

    const forms = await prisma.form.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { submissions: { where: { status: "SUBMITTED" } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // ユーザーの回答状況を取得
    const submissions = await prisma.formSubmission.findMany({
      where: {
        submittedBy: userId,
        formId: { in: forms.map((f) => f.id) },
      },
      select: { formId: true, status: true },
    });
    const submissionMap = new Map(submissions.map((s) => [s.formId, s.status]));

    return forms.map((form) => ({
      ...form,
      responseCount: form._count.submissions,
      mySubmissionStatus: submissionMap.get(form.id) ?? null,
    }));
  },

  /**
   * フォーム詳細取得
   */
  async getFormById(formId: string) {
    return prisma.form.findUnique({
      where: { id: formId },
      include: formInclude,
    });
  },

  /**
   * フォーム作成・更新（upsert）
   * セクション・フィールドを含む全体保存
   */
  async upsertForm(formId: string | null, userId: string, data: FormInput) {
    if (formId) {
      // 更新: 既存フォームを取得して孤立した子を削除
      const existing = await prisma.form.findUnique({
        where: { id: formId },
        include: {
          sections: { include: { fields: true } },
        },
      });
      if (!existing) return null;

      // 送信されたセクション/フィールドIDを収集（temp_は除外）
      const incomingSectionIds = new Set(
        data.sections.filter((s) => isPersistedId(s.id)).map((s) => s.id!),
      );
      const incomingFieldIds = new Set(
        data.sections.flatMap((s) => s.fields.filter((f) => isPersistedId(f.id)).map((f) => f.id!)),
      );

      // 孤立したフィールドとセクションを削除
      const orphanFieldIds = existing.sections
        .flatMap((s) => s.fields)
        .filter((f) => !incomingFieldIds.has(f.id))
        .map((f) => f.id);
      const orphanSectionIds = existing.sections
        .filter((s) => !incomingSectionIds.has(s.id))
        .map((s) => s.id);

      return prisma.$transaction(async (tx) => {
        if (orphanFieldIds.length > 0) {
          await tx.formField.deleteMany({
            where: { id: { in: orphanFieldIds } },
          });
        }
        if (orphanSectionIds.length > 0) {
          await tx.formSection.deleteMany({
            where: { id: { in: orphanSectionIds } },
          });
        }

        // セクションとフィールドのupsert
        for (const section of data.sections) {
          const sectionData = {
            title: section.title,
            titleJa: section.titleJa,
            description: section.description,
            order: section.order,
            conditionalLogic: (section.conditionalLogic as unknown as Prisma.InputJsonValue) ?? undefined,
          };

          const upsertedSection = isPersistedId(section.id)
            ? await tx.formSection.update({
                where: { id: section.id },
                data: sectionData,
              })
            : await tx.formSection.create({
                data: { ...sectionData, formId },
              });

          for (const field of section.fields) {
            const fieldData = {
              type: field.type,
              label: field.label,
              labelJa: field.labelJa,
              placeholder: field.placeholder,
              required: field.required ?? false,
              order: field.order,
              config: (field.config ?? {}) as Prisma.InputJsonValue,
              conditionalLogic: (field.conditionalLogic as unknown as Prisma.InputJsonValue) ?? undefined,
            };

            if (isPersistedId(field.id)) {
              await tx.formField.update({
                where: { id: field.id },
                data: fieldData,
              });
            } else {
              await tx.formField.create({
                data: { ...fieldData, sectionId: upsertedSection.id },
              });
            }
          }
        }

        return tx.form.update({
          where: { id: formId },
          data: {
            title: data.title,
            titleJa: data.titleJa,
            description: data.description,
            descriptionJa: data.descriptionJa,
            allowMultiple: data.allowMultiple,
            settings: (data.settings ?? {}) as Prisma.InputJsonValue,
          },
          include: formInclude,
        });
      });
    }

    // 新規作成
    return prisma.form.create({
      data: {
        title: data.title,
        titleJa: data.titleJa,
        description: data.description,
        descriptionJa: data.descriptionJa,
        allowMultiple: data.allowMultiple ?? false,
        settings: (data.settings ?? {}) as Prisma.InputJsonValue,
        createdBy: userId,
        sections: {
          create: data.sections.map((section) => ({
            title: section.title,
            titleJa: section.titleJa,
            description: section.description,
            order: section.order,
            conditionalLogic: (section.conditionalLogic as unknown as Prisma.InputJsonValue) ?? undefined,
            fields: {
              create: section.fields.map((field) => ({
                type: field.type,
                label: field.label,
                labelJa: field.labelJa,
                placeholder: field.placeholder,
                required: field.required ?? false,
                order: field.order,
                config: (field.config ?? {}) as Prisma.InputJsonValue,
                conditionalLogic: (field.conditionalLogic as unknown as Prisma.InputJsonValue) ?? undefined,
              })),
            },
          })),
        },
      },
      include: formInclude,
    });
  },

  /**
   * フォーム削除（DRAFT/CLOSED のみ）
   */
  async deleteForm(formId: string) {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) return null;
    if (form.status === "PUBLISHED") {
      throw new Error("Cannot delete a published form. Close it first.");
    }
    return prisma.form.delete({ where: { id: formId } });
  },

  /**
   * ステータス変更
   * DRAFT → PUBLISHED, PUBLISHED → CLOSED
   */
  async publishForm(formId: string) {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) return null;

    let newStatus: FormStatus;
    if (form.status === "DRAFT") {
      newStatus = "PUBLISHED";
    } else if (form.status === "PUBLISHED") {
      newStatus = "CLOSED";
    } else {
      throw new Error(`Cannot change status from ${form.status}`);
    }

    return prisma.form.update({
      where: { id: formId },
      data: {
        status: newStatus,
        ...(newStatus === "CLOSED" ? { closedAt: new Date() } : {}),
      },
    });
  },

  /**
   * 再公開（CLOSED → PUBLISHED）
   */
  async reopenForm(formId: string) {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) return null;

    if (form.status !== "CLOSED") {
      throw new Error("締切済みのフォームのみ再公開できます");
    }

    return prisma.form.update({
      where: { id: formId },
      data: { status: "PUBLISHED", closedAt: null },
    });
  },

  /**
   * 公開解除（PUBLISHED → DRAFT）
   * 回答がある場合は全回答を削除し、回答済みユーザIDリストを返す
   */
  async unpublishForm(formId: string) {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) return null;

    if (form.status !== "PUBLISHED") {
      throw new Error("公開中のフォームのみ解除できます");
    }

    // 回答済みユーザを取得
    const submissions = await prisma.formSubmission.findMany({
      where: { formId, status: "SUBMITTED" },
      select: { id: true, submittedBy: true },
    });
    const respondedUserIds = [...new Set(submissions.map((s) => s.submittedBy))];

    // 回答がある場合は全回答（Answer → Submission）を削除
    if (submissions.length > 0) {
      const submissionIds = submissions.map((s) => s.id);
      await prisma.formAnswer.deleteMany({
        where: { submissionId: { in: submissionIds } },
      });
      await prisma.formSubmission.deleteMany({
        where: { id: { in: submissionIds } },
      });
    }

    const updated = await prisma.form.update({
      where: { id: formId },
      data: { status: "DRAFT" },
    });

    return { form: updated, respondedUserIds };
  },

  /**
   * 回答送信
   */
  async submitForm(formId: string, userId: string, answers: AnswerInput[]) {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        sections: { include: { fields: true } },
      },
    });
    if (!form) throw new Error("Form not found");
    if (form.status !== "PUBLISHED") throw new Error("Form is not accepting responses");

    // 既存回答がある場合は上書き（回答を削除してから再作成）
    if (!form.allowMultiple) {
      const existing = await prisma.formSubmission.findFirst({
        where: { formId, submittedBy: userId, status: "SUBMITTED" },
        select: { id: true },
      });
      if (existing) {
        await prisma.formAnswer.deleteMany({ where: { submissionId: existing.id } });
        await prisma.formSubmission.delete({ where: { id: existing.id } });
      }
    }

    // フィールドマップ構築
    const allFields = form.sections.flatMap((s) => s.fields);
    const fieldMap = new Map(allFields.map((f) => [f.id, f]));

    // 回答マップ構築
    const answerMap: Record<string, unknown> = {};
    for (const a of answers) {
      answerMap[a.fieldId] = a.value;
    }

    // セクション条件ロジック評価: 非表示セクションのフィールドIDを収集
    const hiddenSectionFieldIds = new Set<string>();
    for (const section of form.sections) {
      const sectionVisible = evaluateConditions(
        section.conditionalLogic as ConditionalLogic | null,
        answerMap,
      );
      if (!sectionVisible) {
        for (const f of section.fields) {
          hiddenSectionFieldIds.add(f.id);
        }
      }
    }

    // 条件ロジック評価 + バリデーション
    for (const field of allFields) {
      // セクションが非表示ならスキップ
      if (hiddenSectionFieldIds.has(field.id)) continue;

      const visible = evaluateConditions(
        field.conditionalLogic as ConditionalLogic | null,
        answerMap,
      );
      if (!visible) continue;

      if (field.required && field.type !== "SECTION_HEADER") {
        const val = answerMap[field.id];
        if (val === undefined || val === null || val === "") {
          throw new Error(`Field "${field.label}" is required`);
        }
      }
    }

    // 表示されているフィールドの回答のみ保存
    const visibleAnswers = answers.filter((a) => {
      const field = fieldMap.get(a.fieldId);
      if (!field) return false;
      if (hiddenSectionFieldIds.has(a.fieldId)) return false;
      return evaluateConditions(
        field.conditionalLogic as ConditionalLogic | null,
        answerMap,
      );
    });

    return prisma.formSubmission.create({
      data: {
        formId,
        submittedBy: userId,
        status: "SUBMITTED",
        submittedAt: new Date(),
        answers: {
          create: visibleAnswers.map((a) => ({
            fieldId: a.fieldId,
            value: a.value as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        answers: { include: { field: true } },
      },
    });
  },

  /**
   * 回答一覧取得
   */
  async getResponses(formId: string) {
    return prisma.formSubmission.findMany({
      where: { formId, status: "SUBMITTED" },
      include: {
        submitter: { select: { id: true, name: true, email: true } },
        answers: {
          include: { field: { select: { id: true, label: true, labelJa: true, type: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
  },

  /**
   * 個別回答取得
   */
  /**
   * ユーザーの回答を取得（回答済みの場合）
   */
  async getMySubmission(formId: string, userId: string) {
    return prisma.formSubmission.findFirst({
      where: { formId, submittedBy: userId, status: "SUBMITTED" },
      include: {
        answers: {
          include: { field: { select: { id: true, label: true, labelJa: true, type: true } } },
        },
      },
    });
  },

  async getResponseById(submissionId: string) {
    return prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        submitter: { select: { id: true, name: true, email: true } },
        answers: {
          include: { field: { select: { id: true, label: true, labelJa: true, type: true } } },
        },
      },
    });
  },
};
