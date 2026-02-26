import crypto from "node:crypto";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const SETTING_KEY = "mcp_organization_api_key";

/**
 * GET /api/admin/mcp/organization
 *
 * APIキーの存在確認とマスク表示
 */
export const GET = apiHandler(async () => {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: SETTING_KEY },
  });

  if (!setting) {
    return { exists: false, maskedKey: null };
  }

  // 末尾4文字のみ表示
  const maskedKey =
    "●".repeat(Math.max(0, setting.value.length - 4)) +
    setting.value.slice(-4);

  return { exists: true, maskedKey };
}, { admin: true });

/**
 * POST /api/admin/mcp/organization
 *
 * 新規APIキーを生成（既存キーは上書き）
 */
export const POST = apiHandler(async () => {
  const key = `mcp-${crypto.randomBytes(32).toString("hex")}`;

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: key },
    create: { key: SETTING_KEY, value: key },
  });

  return { key };
}, { admin: true });

/**
 * DELETE /api/admin/mcp/organization
 *
 * APIキーを削除
 */
export const DELETE = apiHandler(async () => {
  await prisma.systemSetting.deleteMany({
    where: { key: SETTING_KEY },
  });

  return { success: true };
}, { admin: true });
