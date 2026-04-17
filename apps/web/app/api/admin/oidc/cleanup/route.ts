import { apiHandler } from "@/lib/api/api-handler";
import { AuditService } from "@/lib/services/audit-service";
import { cleanupExpiredOidc } from "@/lib/services/oidc/cleanup";

export const POST = apiHandler(
  async (_request, session) => {
    const result = await cleanupExpiredOidc();
    await AuditService.log({
      action: "OIDC_CLEANUP",
      category: "OIDC",
      userId: session.user.id,
      details: { ...result },
    });
    return { ok: true, result };
  },
  { admin: true },
);
