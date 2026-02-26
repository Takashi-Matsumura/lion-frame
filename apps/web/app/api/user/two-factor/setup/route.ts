import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  generateQrCodeDataUrl,
  generateTotpSecret,
  generateTotpUri,
} from "@/lib/totp";

/**
 * POST /api/user/two-factor/setup
 * Generate a new TOTP secret and QR code for 2FA setup
 */
export const POST = apiHandler(async (_request, session) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { twoFactorEnabled: true },
  });

  if (user?.twoFactorEnabled) {
    throw ApiError.badRequest(
      "Two-factor authentication is already enabled",
    );
  }

  // Generate new secret
  const secret = generateTotpSecret();

  // Generate QR code
  const otpUri = generateTotpUri(session.user.email!, secret);
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpUri);

  return {
    secret,
    qrCodeDataUrl,
  };
});
