import { NextResponse } from "next/server";
import {
  OIDC_SUPPORTED_CLAIMS,
  OIDC_SUPPORTED_CODE_CHALLENGE_METHODS,
  OIDC_SUPPORTED_GRANT_TYPES,
  OIDC_SUPPORTED_RESPONSE_TYPES,
  OIDC_SUPPORTED_SCOPES,
  OIDC_SUPPORTED_SIGNING_ALGS,
  OIDC_SUPPORTED_SUBJECT_TYPES,
  OIDC_SUPPORTED_TOKEN_AUTH_METHODS,
} from "@/lib/services/oidc/constants";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const issuer = process.env.OIDC_ISSUER?.replace(/\/$/, "");
  if (!issuer) {
    return NextResponse.json(
      { error: "server_error", error_description: "OIDC_ISSUER is not set" },
      { status: 500 },
    );
  }

  const doc = {
    issuer,
    authorization_endpoint: `${issuer}/api/oidc/authorize`,
    token_endpoint: `${issuer}/api/oidc/token`,
    userinfo_endpoint: `${issuer}/api/oidc/userinfo`,
    jwks_uri: `${issuer}/api/oidc/jwks`,
    response_types_supported: OIDC_SUPPORTED_RESPONSE_TYPES,
    grant_types_supported: OIDC_SUPPORTED_GRANT_TYPES,
    subject_types_supported: OIDC_SUPPORTED_SUBJECT_TYPES,
    id_token_signing_alg_values_supported: OIDC_SUPPORTED_SIGNING_ALGS,
    scopes_supported: OIDC_SUPPORTED_SCOPES,
    token_endpoint_auth_methods_supported: OIDC_SUPPORTED_TOKEN_AUTH_METHODS,
    code_challenge_methods_supported: OIDC_SUPPORTED_CODE_CHALLENGE_METHODS,
    claims_supported: OIDC_SUPPORTED_CLAIMS,
    claims_parameter_supported: false,
    request_parameter_supported: false,
    request_uri_parameter_supported: false,
    require_pushed_authorization_requests: false,
  };

  return NextResponse.json(doc, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
