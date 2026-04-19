import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { ApiError, apiHandler } from "@/lib/api";
import { AuditService } from "@/lib/services/audit-service";
import {
  clearChallenge,
  getChallenge,
} from "@/lib/webauthn/challenge-cookie";
import { CredentialService } from "@/lib/webauthn/credential-service";
import { verifyAuthentication } from "@/lib/webauthn/verify";

type Body = {
  response: AuthenticationResponseJSON;
};

export const POST = apiHandler(async (request, session) => {
  const body = (await request.json().catch(() => null)) as Body | null;

  if (!body?.response) {
    throw ApiError.badRequest("invalid body");
  }

  const ctx = await getChallenge();
  if (
    !ctx ||
    ctx.kind !== "test" ||
    ctx.userId !== session.user.id ||
    !ctx.credentialDbId
  ) {
    await clearChallenge();
    throw ApiError.badRequest("no active test challenge");
  }

  const assertion = body.response;
  const stored = await CredentialService.findByCredentialId(assertion.id);

  if (!stored || stored.userId !== session.user.id) {
    await clearChallenge();
    throw ApiError.badRequest("credential not found");
  }

  if (stored.id !== ctx.credentialDbId) {
    await clearChallenge();
    throw ApiError.badRequest("credential mismatch");
  }

  try {
    const { newCounter } = await verifyAuthentication(
      assertion,
      ctx.challenge,
      {
        credentialId: stored.credentialId,
        publicKey: stored.publicKey,
        counter: stored.counter,
        transports: stored.transports,
      },
    );

    await CredentialService.updateCounter(stored.id, newCounter);
  } catch (error) {
    await clearChallenge();
    throw ApiError.badRequest(
      error instanceof Error ? error.message : "verification failed",
    );
  }

  await clearChallenge();

  await AuditService.log({
    action: "WEBAUTHN_TEST",
    category: "USER_MANAGEMENT",
    userId: session.user.id,
    targetId: stored.id,
    targetType: "WebAuthnCredential",
  });

  return { success: true };
});
