import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const KEY = "organization_group_name";

// GET /api/admin/organization/group-name
export const GET = apiHandler(async () => {
  const row = await prisma.systemSetting.findUnique({
    where: { key: KEY },
  });

  return { groupName: row?.value ?? "" };
}, { admin: true });

// PUT /api/admin/organization/group-name
export const PUT = apiHandler(async (request) => {
  const body = await request.json();
  const { groupName } = body;

  if (typeof groupName !== "string") {
    throw ApiError.badRequest("Invalid body");
  }

  const value = groupName.trim();

  if (value) {
    await prisma.systemSetting.upsert({
      where: { key: KEY },
      update: { value },
      create: { key: KEY, value },
    });
  } else {
    // 空文字の場合は削除（連名フォールバックに戻す）
    await prisma.systemSetting.deleteMany({
      where: { key: KEY },
    });
  }

  return { success: true };
}, { admin: true });
