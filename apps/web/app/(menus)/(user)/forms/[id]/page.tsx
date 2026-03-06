import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { FormAnswerClient } from "./FormAnswerClient";
import { formsTranslations, type Language } from "../translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = formsTranslations[language];
  return { title: t.title };
}

export default async function FormAnswerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const language = (await getLanguage()) as Language;
  return <FormAnswerClient formId={id} language={language} />;
}
