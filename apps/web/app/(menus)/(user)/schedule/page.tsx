import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { ScheduleClient } from "./ScheduleClient";
import { scheduleTranslations, type Language } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = scheduleTranslations[language];
  return { title: t.title };
}

export default async function SchedulePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;

  return <ScheduleClient language={language} />;
}
