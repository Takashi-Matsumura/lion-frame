import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import WorkflowSettingsClient from "./WorkflowSettingsClient";
import { workflowSettingsTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = workflowSettingsTranslations[language];
  return { title: t.pageTitle };
}

export default async function WorkflowSettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = await getLanguage();
  return (
    <div className="max-w-5xl mx-auto">
      <WorkflowSettingsClient language={language as "en" | "ja"} />
    </div>
  );
}
