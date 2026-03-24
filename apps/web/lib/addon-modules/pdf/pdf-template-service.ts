import { prisma } from "@/lib/prisma";
import type { PdfTemplate } from "@prisma/client";

export class PdfTemplateService {
  static async listTemplates(): Promise<PdfTemplate[]> {
    return prisma.pdfTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  static async getTemplate(id: string): Promise<PdfTemplate | null> {
    return prisma.pdfTemplate.findUnique({ where: { id } });
  }

  static async getDefaultTemplate(): Promise<PdfTemplate | null> {
    return prisma.pdfTemplate.findFirst({
      where: { isDefault: true },
    });
  }

  static async createTemplate(
    data: {
      name: string;
      isDefault?: boolean;
      headerLeft?: string;
      headerCenter?: string;
      headerRight?: string;
      footerLeft?: string;
      footerCenter?: string;
      footerRight?: string;
      headerFontSize?: number;
      footerFontSize?: number;
      marginTop?: number;
      marginBottom?: number;
      marginLeft?: number;
      marginRight?: number;
      showPageNumber?: boolean;
      pageNumberFormat?: string;
    },
    createdBy: string,
  ): Promise<PdfTemplate> {
    if (data.isDefault) {
      await prisma.pdfTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.pdfTemplate.create({
      data: {
        ...data,
        createdBy,
      },
    });
  }

  static async updateTemplate(
    id: string,
    data: Partial<{
      name: string;
      isDefault: boolean;
      headerLeft: string | null;
      headerCenter: string | null;
      headerRight: string | null;
      footerLeft: string | null;
      footerCenter: string | null;
      footerRight: string | null;
      headerFontSize: number;
      footerFontSize: number;
      marginTop: number;
      marginBottom: number;
      marginLeft: number;
      marginRight: number;
      showPageNumber: boolean;
      pageNumberFormat: string;
    }>,
  ): Promise<PdfTemplate> {
    if (data.isDefault) {
      await prisma.pdfTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return prisma.pdfTemplate.update({
      where: { id },
      data,
    });
  }

  static async deleteTemplate(id: string): Promise<void> {
    await prisma.pdfTemplate.delete({ where: { id } });
  }

  static async setDefault(id: string): Promise<void> {
    await prisma.pdfTemplate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    await prisma.pdfTemplate.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
