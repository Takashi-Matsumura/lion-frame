import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { CredentialService } from "@/lib/webauthn/credential-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; credentialId: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id, credentialId } = await params;

    const credential = await prisma.webAuthnCredential.findFirst({
      where: { id: credentialId, userId: id },
      select: { id: true, credentialId: true },
    });
    if (!credential) {
      throw ApiError.notFound("Passkey not found");
    }

    const deleted = await CredentialService.deleteForce(credential.id);
    if (!deleted) {
      throw ApiError.notFound("Passkey not found");
    }

    await AuditService.log({
      action: "WEBAUTHN_ADMIN_DELETE",
      category: "USER_MANAGEMENT",
      userId: session.user.id,
      targetId: credential.id,
      targetType: "WebAuthnCredential",
      details: {
        targetUserId: id,
        credentialId: credential.credentialId,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error deleting admin passkey:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
