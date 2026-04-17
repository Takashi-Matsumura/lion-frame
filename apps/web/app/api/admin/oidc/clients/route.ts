import type { Role } from "@prisma/client";
import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { AuditService } from "@/lib/services/audit-service";
import { OIDCClientService } from "@/lib/services/oidc/client-service";

export const GET = apiHandler(
  async () => {
    const clients = await OIDCClientService.list();
    return { clients };
  },
  { admin: true },
);

export const POST = apiHandler(
  async (request, session) => {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      redirectUris?: string[];
      allowedScopes?: string[];
      allowedRoles?: Role[];
      autoApprove?: boolean;
    };

    if (!body.name || typeof body.name !== "string") {
      throw ApiError.badRequest("name is required");
    }
    if (!Array.isArray(body.redirectUris) || body.redirectUris.length === 0) {
      throw ApiError.badRequest("redirectUris must be a non-empty array");
    }

    try {
      const result = await OIDCClientService.create({
        name: body.name,
        description: body.description,
        redirectUris: body.redirectUris,
        allowedScopes: body.allowedScopes,
        allowedRoles: body.allowedRoles,
        autoApprove: body.autoApprove,
        createdBy: session.user.id,
      });

      await AuditService.log({
        action: "OIDC_CLIENT_CREATE",
        category: "OIDC",
        userId: session.user.id,
        targetId: result.client.id,
        targetType: "OIDCClient",
        details: {
          clientId: result.client.clientId,
          name: result.client.name,
          redirectUris: result.client.redirectUris,
        },
      });

      // クライアントシークレットは平文で一度だけ返す
      return {
        client: result.client,
        clientSecret: result.clientSecret,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("redirect_uri")) {
        throw ApiError.badRequest(error.message);
      }
      throw error;
    }
  },
  { admin: true, successStatus: 201 },
);
