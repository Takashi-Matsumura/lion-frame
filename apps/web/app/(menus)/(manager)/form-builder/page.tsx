import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { FormBuilderClient } from "./FormBuilderClient";
import { formBuilderTranslations, type Language } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = formBuilderTranslations[language];
  return { title: t.title };
}

export default async function FormBuilderPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;
  return <FormBuilderClient language={language} />;
}
