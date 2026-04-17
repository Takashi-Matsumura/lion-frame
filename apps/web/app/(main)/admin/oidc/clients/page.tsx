import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { OidcClientsClient } from "./OidcClientsClient";
import { oidcClientsTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = oidcClientsTranslations[language];
  return { title: t.title };
}

export default async function OidcClientsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = await getLanguage();

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <OidcClientsClient language={language as "en" | "ja"} />
    </div>
  );
}
