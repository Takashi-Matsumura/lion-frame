import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { HealthCheckupService } from "@/lib/addon-modules/health-checkup/health-checkup-service";
import {
  parseHealthCheckupXlsx,
  previewImport,
} from "@/lib/importers/health-checkup/health-checkup-importer";
import type { ColumnMapping } from "@/lib/importers/health-checkup/types";
import type { Role } from "@prisma/client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const POST = apiHandler(async (request) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/api/health-checkup/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Campaign ID is required");

  const campaign = await HealthCheckupService.getCampaignById(id);
  if (!campaign) throw ApiError.notFound("Campaign not found", "キャンペーンが見つかりません");

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) throw ApiError.badRequest("File is required", "ファイルを選択してください");

  if (file.size > MAX_FILE_SIZE) {
    throw ApiError.badRequest("File too large", "ファイルサイズが大きすぎます（上限10MB）");
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw ApiError.badRequest("Invalid XLSX file", "不正なXLSXファイルです");
  }

  const buffer = Buffer.from(arrayBuffer);
  const { headers, rows } = await parseHealthCheckupXlsx(buffer);

  // カラムマッピング取得
  const mappingStr = formData.get("columnMapping") as string | null;
  const mapping: ColumnMapping = mappingStr ? JSON.parse(mappingStr) : {};

  const action = formData.get("action") as string | null;

  if (action === "confirm") {
    // プレビュー → 確定
    const preview = await previewImport(rows, mapping);
    const records = preview.matched.map((m) => ({
      employeeId: m.employeeDbId,
      bookingMethod: m.bookingMethod,
      checkupType: m.checkupType,
      preferredDates: m.preferredDates,
      rawData: m.rawData,
    }));
    const result = await HealthCheckupService.upsertRecords(id, records);

    // カラムマッピングをキャンペーンに保存
    if (Object.keys(mapping).length > 0) {
      await HealthCheckupService.updateCampaign(id, { columnMapping: mapping as unknown as Record<string, string> });
    }

    return {
      success: true,
      ...result,
      unmatched: preview.unmatched.length,
      duplicates: preview.duplicates.length,
    };
  }

  // デフォルト: プレビュー
  const preview = await previewImport(rows, mapping);
  return { headers, preview };
}, { requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[] });
