import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import InstructorView from "./InstructorView";
import type { Language } from "@/components/handson/types";

const translations = {
  en: { title: "Hands-on Management" },
  ja: { title: "ハンズオン管理" },
};

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = translations[language as "en" | "ja"] || translations.en;
  return { title: t.title };
}

export default async function HandsonManagementPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;

  return (
    <InstructorView
      language={language}
      userId={session.user.id}
      userRole={session.user.role as string}
    />
  );
}
