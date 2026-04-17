import { NextResponse } from "next/server";
import { getPublicJwks } from "@/lib/services/oidc/keys";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const jwks = await getPublicJwks();
    return NextResponse.json(jwks, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("[OIDC] jwks endpoint error:", error);
    return NextResponse.json(
      {
        error: "server_error",
        error_description: "Failed to load signing keys",
      },
      { status: 500 },
    );
  }
}
