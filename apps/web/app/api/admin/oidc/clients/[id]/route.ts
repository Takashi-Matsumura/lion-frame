import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { AuditService } from "@/lib/services/audit-service";
import { OIDCClientService } from "@/lib/services/oidc/client-service";

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(error.toJSON(), { status: error.status });
  }
  console.error("[OIDC admin/clients/[id]]", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const client = await OIDCClientService.getById(id);
    if (!client) throw ApiError.notFound("OIDC client not found");
    return NextResponse.json({ client });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
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
      return NextResponse.json({ client });
    } catch (error) {
      if (error instanceof Error && error.message.includes("redirect_uri")) {
        throw ApiError.badRequest(error.message);
      }
      throw error;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
