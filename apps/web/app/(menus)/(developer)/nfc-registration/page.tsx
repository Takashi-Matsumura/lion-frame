import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { NfcRegistrationClient } from "./NfcRegistrationClient";
import {
  nfcRegistrationTranslations,
  type Language,
} from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = nfcRegistrationTranslations[language];
  return { title: t.title };
}

export default async function NfcRegistrationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;
  return <NfcRegistrationClient language={language} />;
}
