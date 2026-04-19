import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { setChallenge } from "@/lib/webauthn/challenge-cookie";
import { buildAuthenticationOptions } from "@/lib/webauthn/verify";

type Body = {
  credentialDbId?: string;
};

export const POST = apiHandler(async (request, session) => {
  const body = (await request.json().catch(() => null)) as Body | null;
  const credentialDbId = body?.credentialDbId;

  if (!credentialDbId) {
    throw ApiError.badRequest("credentialDbId is required");
  }

  const credential = await prisma.webAuthnCredential.findFirst({
    where: { id: credentialDbId, userId: session.user.id },
    select: { credentialId: true, transports: true },
  });

  if (!credential) {
    throw ApiError.notFound("credential not found");
  }

  const options = await buildAuthenticationOptions([
    {
      credentialId: credential.credentialId,
      transports: credential.transports,
    },
  ]);

  await setChallenge({
    challenge: options.challenge,
    kind: "test",
    userId: session.user.id,
    credentialDbId,
  });

  return options;
});
