import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireOneOfRoles } from "@/lib/api/auth-guard";
import { FormsService } from "@/lib/addon-modules/forms/forms-service";

export async function GET(request: Request) {
  try {
    await requireOneOfRoles(["MANAGER", "EXECUTIVE", "ADMIN"]);

    const url = new URL(request.url);
    const id = url.pathname.split("/api/forms/")[1]?.split("/")[0];
    if (!id) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
    }

    const form = await FormsService.getFormById(id);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const responses = await FormsService.getResponses(id);

    // フィールド順序（セクション順 → フィールド順、SECTION_HEADER除外）
    const fields = form.sections
      .sort((a, b) => a.order - b.order)
      .flatMap((s) =>
        s.fields
          .filter((f) => f.type !== "SECTION_HEADER")
          .sort((a, b) => a.order - b.order)
          .map((f) => ({
            id: f.id,
            label: f.labelJa || f.label,
            type: f.type,
          })),
      );

    // XLSX生成
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "LionFrame";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("回答一覧");

    // ─── ヘッダー行 ───
    const headers = ["回答者", "回答日", ...fields.map((f) => f.label)];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
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

    // ─── データ行 ───
    for (const sub of responses) {
      const answerMap = new Map(
        sub.answers.map((a: { field: { id: string }; value: unknown }) => [
          a.field.id,
          a.value,
        ]),
      );

      const row = sheet.addRow([
        sub.submitter.name ?? sub.submitter.email ?? "-",
        sub.submittedAt
          ? new Date(sub.submittedAt).toLocaleDateString("ja-JP")
          : "-",
        ...fields.map((f) => formatValue(answerMap.get(f.id), f.type)),
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      });
    }

    // ─── 列幅調整 ───
    sheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? "").length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 4, 40);
    });

    // ─── レスポンス ───
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const formTitle = (form.titleJa || form.title).replace(/[/\\?*[\]]/g, "_");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="responses.xlsx"; filename*=UTF-8''${encodeURIComponent(`${formTitle}_回答一覧.xlsx`)}`,
      },
    });
  } catch (error) {
    console.error("[API Error] Form responses export:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 },
    );
  }
}

function formatValue(value: unknown, fieldType: string): string {
  if (value === null || value === undefined) return "";
  if (fieldType === "YES_NO")
    return value === true || value === "true" ? "はい" : "いいえ";
  if (fieldType === "DATE_SLOTS" && Array.isArray(value)) {
    return value
      .map((v, i) => (v ? `第${i + 1}希望: ${v}` : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (Array.isArray(value))
    return value.filter((v) => v !== "__other__").join(", ");
  if (value === "__other__") return "その他";
  return String(value);
}
