import { apiHandler } from "@/lib/api";
import { CredentialService } from "@/lib/webauthn/credential-service";

export const GET = apiHandler(async (_request, session) => {
  const credentials = await CredentialService.listByUser(session.user.id);
  return { credentials };
});
