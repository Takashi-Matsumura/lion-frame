import { prisma } from "@/lib/prisma";
import type { EditorDocumentStatus, EditorDocumentVisibility, Prisma } from "@prisma/client";

const DOC_LIST_SELECT = {
  id: true,
  title: true,
  type: true,
  status: true,
  visibility: true,
  publishedAt: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  creator: { select: { name: true } },
} satisfies Prisma.EditorDocumentSelect;

export class EditorService {
  /** 自分のドキュメント一覧 */
  static async listDocuments(userId: string, type?: string) {
    return prisma.editorDocument.findMany({
      where: { createdBy: userId, ...(type ? { type } : {}) },
      select: DOC_LIST_SELECT,
      orderBy: { updatedAt: "desc" },
    });
  }

  /** 公開ドキュメント一覧（自分以外の作成者、PUBLISHED のみ） */
  static async listPublishedDocuments(
    userId: string,
    _visibility?: EditorDocumentVisibility,
    departmentId?: string,
  ) {
    // 全社公開ドキュメント
    const orgDocs = await prisma.editorDocument.findMany({
      where: {
        createdBy: { not: userId },
        status: "PUBLISHED",
        visibility: "ORGANIZATION",
      },
      select: DOC_LIST_SELECT,
      orderBy: { publishedAt: "desc" },
    });

    // 部署内公開ドキュメント（同部署のユーザが作成したもの）
    let deptDocs: typeof orgDocs = [];
    if (departmentId) {
      // 同部署の社員のメールアドレスを取得
      const deptEmployees = await prisma.employee.findMany({
        where: { departmentId, isActive: true, email: { not: null } },
        select: { email: true },
      });
      const deptEmails = deptEmployees.map((e) => e.email).filter(Boolean) as string[];

      if (deptEmails.length > 0) {
        // 同部署ユーザのIDを取得
        const deptUsers = await prisma.user.findMany({
          where: { email: { in: deptEmails }, id: { not: userId } },
          select: { id: true },
        });
        const deptUserIds = deptUsers.map((u) => u.id);

        if (deptUserIds.length > 0) {
          deptDocs = await prisma.editorDocument.findMany({
            where: {
              createdBy: { in: deptUserIds },
              status: "PUBLISHED",
              visibility: "DEPARTMENT",
            },
            select: DOC_LIST_SELECT,
            orderBy: { publishedAt: "desc" },
          });
        }
      }
    }

    // 統合（重複排除）
    const allIds = new Set(orgDocs.map((d) => d.id));
    return [...orgDocs, ...deptDocs.filter((d) => !allIds.has(d.id))];
  }

  static async getDocument(id: string) {
    return prisma.editorDocument.findUnique({ where: { id } });
  }

  static async createDocument(userId: string, data: { title?: string; content?: string; type?: string }) {
    return prisma.editorDocument.create({
      data: {
        title: data.title || "無題",
        content: data.content || "",
        type: data.type || "markdown",
        createdBy: userId,
      },
    });
  }

  static async updateDocument(
    id: string,
    data: {
      title?: string;
      content?: string;
      status?: EditorDocumentStatus;
      visibility?: EditorDocumentVisibility;
    },
    publishedBy?: string,
  ) {
    const updateData: Prisma.EditorDocumentUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;

    // PUBLISHED に変更された場合、公開日時を記録
    if (data.status === "PUBLISHED") {
      updateData.publishedAt = new Date();
      if (publishedBy) updateData.publishedBy = publishedBy;
      // PRIVATE のまま公開は論理矛盾 → DEPARTMENT に自動昇格
      if (data.visibility === "PRIVATE" || (!data.visibility && !updateData.visibility)) {
        const current = await prisma.editorDocument.findUnique({
          where: { id },
          select: { visibility: true },
        });
        if (current?.visibility === "PRIVATE") {
          updateData.visibility = "DEPARTMENT";
        }
      }
    }

    return prisma.editorDocument.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteDocument(id: string) {
    return prisma.editorDocument.delete({ where: { id } });
  }

  /** マークダウンの最初の # 行からタイトルを抽出 */
  static extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)/m);
    return match ? match[1].trim() : "無題";
  }
}
