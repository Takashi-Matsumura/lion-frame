import type { Role } from "@prisma/client";
import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { AuditService } from "@/lib/services/audit-service";
import { OIDCClientService } from "@/lib/services/oidc/client-service";

function extractIdFromUrl(request: Request): string {
  const { pathname } = new URL(request.url);
  const segments = pathname.split("/").filter(Boolean);
  // /api/admin/oidc/clients/[id]
  const id = segments[segments.length - 1];
  if (!id) throw ApiError.badRequest("id is required");
  return id;
}

export const GET = apiHandler(
  async (request) => {
    const id = extractIdFromUrl(request);
    const client = await OIDCClientService.getById(id);
    if (!client) throw ApiError.notFound("OIDC client not found");
    return { client };
  },
  { admin: true },
);

export const PATCH = apiHandler(
  async (request, session) => {
    const id = extractIdFromUrl(request);
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      redirectUris?: string[];
      allowedScopes?: string[];
      allowedRoles?: Role[];
      enabled?: boolean;
      autoApprove?: boolean;
    };

    const existing = await OIDCClientService.getById(id);
    if (!existing) throw ApiError.notFound("OIDC client not found");

    try {
      const client = await OIDCClientService.update(id, body);

      await AuditService.log({
        action: "OIDC_CLIENT_UPDATE",
        category: "OIDC",
        userId: session.user.id,
        targetId: client.id,
        targetType: "OIDCClient",
        details: { changes: body },
      });

      return { client };
    } catch (error) {
      if (error instanceof Error && error.message.includes("redirect_uri")) {
        throw ApiError.badRequest(error.message);
      }
      throw error;
    }
  },
  { admin: true },
);

export const DELETE = apiHandler(
  async (request, session) => {
    const id = extractIdFromUrl(request);
    const existing = await OIDCClientService.getById(id);
    if (!existing) throw ApiError.notFound("OIDC client not found");

    await OIDCClientService.delete(id);

    await AuditService.log({
      action: "OIDC_CLIENT_DELETE",
      category: "OIDC",
      userId: session.user.id,
      targetId: existing.id,
      targetType: "OIDCClient",
      details: { clientId: existing.clientId, name: existing.name },
    });

    return { ok: true };
  },
  { admin: true },
);
