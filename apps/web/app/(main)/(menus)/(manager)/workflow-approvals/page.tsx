import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { WorkflowApprovalsClient } from "./WorkflowApprovalsClient";
import { workflowApprovalsTranslations, type Language } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = workflowApprovalsTranslations[language];
  return { title: t.title };
}

export default async function WorkflowApprovalsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;

  return <WorkflowApprovalsClient language={language} />;
}
