import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { WelcomeClient } from "./WelcomeClient";

const translations = {
  en: { title: "Welcome" },
  ja: { title: "ようこそ" },
};

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = translations[language as "en" | "ja"] || translations.en;
  return { title: t.title };
}

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // GUEST以外はダッシュボードへ
  if (session.user.role !== "GUEST") {
    redirect("/dashboard");
  }

  const language = await getLanguage();

  return <WelcomeClient language={language as "en" | "ja"} userName={session.user.name || ""} />;
}
