import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { CalendarManagementClient } from "./CalendarManagementClient";
import { calendarManagementTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = calendarManagementTranslations[language];
  return { title: t.title };
}

export default async function CalendarManagementPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = (await getLanguage()) as "en" | "ja";

  return <CalendarManagementClient language={language} />;
}
