import { apiHandler } from "@/lib/api/api-handler";
import { getSigningKeyStatus } from "@/lib/services/oidc/keys";

export const GET = apiHandler(
  async () => {
    const status = await getSigningKeyStatus();
    return { status };
  },
  { admin: true },
);
