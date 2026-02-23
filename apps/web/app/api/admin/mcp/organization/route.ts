import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SETTING_KEY = "mcp_organization_api_key";

/**
 * GET /api/admin/mcp/organization
 *
 * APIキーの存在確認とマスク表示
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (!setting) {
      return NextResponse.json({ exists: false, maskedKey: null });
    }

    // 末尾4文字のみ表示
    const maskedKey =
      "●".repeat(Math.max(0, setting.value.length - 4)) +
      setting.value.slice(-4);

    return NextResponse.json({ exists: true, maskedKey });
  } catch (error) {
    console.error("Error checking MCP API key:", error);
    return NextResponse.json(
      { error: "Failed to check API key" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/mcp/organization
 *
 * 新規APIキーを生成（既存キーは上書き）
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const key = `mcp-${crypto.randomBytes(32).toString("hex")}`;

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: key },
      create: { key: SETTING_KEY, value: key },
    });

    return NextResponse.json({ key });
  } catch (error) {
    console.error("Error generating MCP API key:", error);
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/mcp/organization
 *
 * APIキーを削除
 */
export async function DELETE() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.systemSetting.deleteMany({
      where: { key: SETTING_KEY },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting MCP API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 },
    );
  }
}
