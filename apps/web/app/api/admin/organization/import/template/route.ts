import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEMPLATE_COLUMNS } from "@/lib/importers/organization/column-mapping";

/**
 * GET /api/admin/organization/import/template
 *
 * インポート用XLSXテンプレートをダウンロード
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "LionFrame";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("社員データ");

    // ヘッダー行
    const headerRow = sheet.addRow(TEMPLATE_COLUMNS.map((c) => c.name));
    headerRow.eachCell((cell, colNumber) => {
      const col = TEMPLATE_COLUMNS[colNumber - 1];
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: col.required ? "FF2563EB" : "FF6B7280" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    headerRow.height = 24;

    // サンプル行（説明つき）
    const sampleRow = sheet.addRow(TEMPLATE_COLUMNS.map((c) => c.example));
    sampleRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF9CA3AF" }, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
    });

    // カラム幅を設定
    TEMPLATE_COLUMNS.forEach((col, i) => {
      sheet.getColumn(i + 1).width = col.width;
    });

    // ヘッダー行をフリーズ
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // バッファに書き出し
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="lionframe-import-template.xlsx"',
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 },
    );
  }
}
