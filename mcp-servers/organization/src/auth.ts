import { PrismaClient } from "@prisma/client";

/**
 * APIキー検証
 *
 * 環境変数 MCP_API_KEY を SystemSetting テーブルの
 * mcp_organization_api_key と照合する
 */
export async function validateApiKey(
  prisma: PrismaClient,
): Promise<{ valid: boolean; error?: string }> {
  const apiKey = process.env.MCP_API_KEY;

  if (!apiKey) {
    return { valid: false, error: "MCP_API_KEY environment variable is not set" };
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "mcp_organization_api_key" },
    });

    if (!setting) {
      return { valid: false, error: "API key is not configured in system settings" };
    }

    if (setting.value !== apiKey) {
      return { valid: false, error: "Invalid API key" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `API key validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
