import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";
import { settingsTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = settingsTranslations[language];

  return {
    title: t.title,
  };
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const language = await getLanguage();
  const t = settingsTranslations[language];

  const user = await prisma.user.findUnique({
    where: { email: session.user.email ?? "" },
    select: {
      forcePasswordChange: true,
    },
  });

  return (
    <SettingsClient
      language={language}
      translations={t}
      mustChangePassword={user?.forcePasswordChange ?? false}
    />
  );
}
