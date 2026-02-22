import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import RequestsClient from "./RequestsClient";
import { requestTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = requestTranslations[language];
  return { title: t.pageTitle };
}

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const language = await getLanguage();
  return (
    <div className="max-w-5xl mx-auto">
      <RequestsClient language={language as "en" | "ja"} />
    </div>
  );
}
