import { prisma } from "@/lib/prisma";

export class EditorService {
  static async listDocuments(userId: string, type = "markdown") {
    return prisma.editorDocument.findMany({
      where: { createdBy: userId, type },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
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

  static async updateDocument(id: string, data: { title?: string; content?: string }) {
    const updateData: { title?: string; content?: string } = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;

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
