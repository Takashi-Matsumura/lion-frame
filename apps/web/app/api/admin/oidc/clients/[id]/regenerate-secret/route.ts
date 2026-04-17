import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { AuditService } from "@/lib/services/audit-service";
import { OIDCClientService } from "@/lib/services/oidc/client-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

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

    return NextResponse.json({
      client: result.client,
      clientSecret: result.clientSecret,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("[OIDC regenerate-secret]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
