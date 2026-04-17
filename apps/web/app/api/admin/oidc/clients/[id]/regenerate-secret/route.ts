import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { AuditService } from "@/lib/services/audit-service";
import { OIDCClientService } from "@/lib/services/oidc/client-service";

export const POST = apiHandler(
  async (request, session) => {
    const { pathname } = new URL(request.url);
    const segments = pathname.split("/").filter(Boolean);
    // /api/admin/oidc/clients/[id]/regenerate-secret
    const id = segments[segments.length - 2];
    if (!id) throw ApiError.badRequest("id is required");

    const existing = await OIDCClientService.getById(id);
    if (!existing) throw ApiError.notFound("OIDC client not found");

    const result = await OIDCClientService.regenerateSecret(id);

    await AuditService.log({
      action: "OIDC_CLIENT_SECRET_REGENERATE",
      category: "OIDC",
      userId: session.user.id,
      targetId: result.client.id,
      targetType: "OIDCClient",
      details: { clientId: result.client.clientId },
    });

    return {
      client: result.client,
      clientSecret: result.clientSecret,
    };
  },
  { admin: true },
);
