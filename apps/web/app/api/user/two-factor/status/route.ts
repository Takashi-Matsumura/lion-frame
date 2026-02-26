import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/two-factor/status
 * Get the current 2FA status for the logged-in user
 */
export const GET = apiHandler(async (_request, session) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { twoFactorEnabled: true },
  });

  return {
    enabled: user?.twoFactorEnabled ?? false,
  };
});
