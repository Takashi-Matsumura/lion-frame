import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { verifySignedValue } from "@/lib/services/cookie-signer";
import { OIDC_AUTH_REQUEST_COOKIE } from "@/lib/services/oidc/constants";
import { OIDCConsentService } from "@/lib/services/oidc/consent-service";
import { ConsentClient } from "./ConsentClient";
import { oidcConsentTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = oidcConsentTranslations[language];
  return { title: t.title };
}

export default async function OidcConsentPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const signed = cookieStore.get(OIDC_AUTH_REQUEST_COOKIE)?.value;
  const handle = signed ? await verifySignedValue(signed) : null;

  const language = await getLanguage();
  const t = oidcConsentTranslations[language];

  if (!handle) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 rounded-lg border bg-background text-center space-y-4">
        <h1 className="text-lg font-semibold">{t.sessionExpired}</h1>
      </div>
    );
  }

  const authRequest = await OIDCConsentService.getAuthRequest(handle);
  if (!authRequest) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 rounded-lg border bg-background text-center space-y-4">
        <h1 className="text-lg font-semibold">{t.sessionExpired}</h1>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-16">
      <ConsentClient
        handle={handle}
        clientName={authRequest.client.name}
        clientDescription={authRequest.client.description}
        scope={authRequest.scope}
        language={language as "en" | "ja"}
      />
    </div>
  );
}
