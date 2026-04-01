import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { BackupClient } from "./BackupClient";
import { backupTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = backupTranslations[language];
  return { title: t.title };
}

export default async function BackupPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = await getLanguage();

  return (
    <div className="max-w-5xl mx-auto mt-8">
      <BackupClient language={language as "en" | "ja"} />
    </div>
  );
}
