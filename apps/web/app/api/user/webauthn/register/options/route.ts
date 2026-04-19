import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { setChallenge } from "@/lib/webauthn/challenge-cookie";
import { CredentialService } from "@/lib/webauthn/credential-service";
import { buildRegistrationOptions } from "@/lib/webauthn/verify";

export const POST = apiHandler(async (_request, session) => {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true },
  });

  if (!user?.email) {
    throw ApiError.badRequest("User email is required to register a passkey");
  }

  const existing = await CredentialService.listByUser(user.id);

  const options = await buildRegistrationOptions({
    userId: user.id,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    excludeCredentials: existing.map((c) => ({
      credentialId: c.credentialId,
      transports: c.transports,
    })),
  });

  await setChallenge({
    challenge: options.challenge,
    kind: "registration",
    userId: user.id,
  });

  return options;
});
