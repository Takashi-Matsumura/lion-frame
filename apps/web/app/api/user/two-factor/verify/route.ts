import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";

/**
 * POST /api/user/two-factor/verify
 * Verify TOTP code during login (called from login flow)
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { email, code } = body;

  if (!email || !code) {
    throw ApiError.badRequest("Email and code are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
    throw ApiError.badRequest(
      "Two-factor authentication is not enabled for this user",
    );
  }

  // Verify the TOTP code
  const isValid = verifyTotp(code, user.twoFactorSecret);

  if (!isValid) {
    throw ApiError.badRequest("Invalid verification code");
  }

  return { success: true };
}, { public: true });
