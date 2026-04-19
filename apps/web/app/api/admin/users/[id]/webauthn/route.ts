import { NextResponse } from "next/server";
import { ApiError, requireAdmin } from "@/lib/api";
import { CredentialService } from "@/lib/webauthn/credential-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const credentials = await CredentialService.listByUser(id);
    return NextResponse.json({ credentials });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }
    console.error("Error listing admin passkeys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
