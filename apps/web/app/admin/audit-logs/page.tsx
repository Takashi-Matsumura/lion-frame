import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { AuditLogsClient } from "./AuditLogsClient";
import { auditLogsTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = auditLogsTranslations[language];

  return {
    title: t.title,
  };
}

export default async function AuditLogsPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = await getLanguage();

  return <AuditLogsClient language={language as "en" | "ja"} />;
}
