import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { KioskManagerClient } from "./KioskManagerClient";
import { kioskManagerTranslations, type Language } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = kioskManagerTranslations[language];
  return { title: t.title };
}

export default async function KioskManagerPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = (await getLanguage()) as Language;
  return <KioskManagerClient language={language} />;
}
