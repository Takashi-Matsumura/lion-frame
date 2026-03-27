import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { GuestProfileClient } from "./GuestProfileClient";

const translations = {
  en: { title: "Guest Profile" },
  ja: { title: "ゲストプロフィール" },
};

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = translations[language as "en" | "ja"] || translations.en;
  return { title: t.title };
}

export default async function GuestProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "GUEST") {
    redirect("/profile");
  }

  const language = await getLanguage();

  return (
    <GuestProfileClient
      language={language as "en" | "ja"}
      userName={session.user.name || "Guest User"}
      email={session.user.email || ""}
    />
  );
}
