import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { HolidayManagementClient } from "./HolidayManagementClient";
import { holidayTranslations, type Language } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = holidayTranslations[language];
  return { title: t.title };
}

export default async function HolidaysPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = (await getLanguage()) as Language;

  return <HolidayManagementClient language={language} />;
}
