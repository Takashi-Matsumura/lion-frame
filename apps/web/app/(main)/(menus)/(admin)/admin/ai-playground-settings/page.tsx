import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { AiPlaygroundSettingsClient } from "./AiPlaygroundSettingsClient";

export const metadata: Metadata = {
  title: "AI Playground Settings",
};

type TabId = "llm" | "prompts" | "search" | "rag";
const VALID_TABS: TabId[] = ["llm", "prompts", "search", "rag"];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = await getLanguage();
  const params = await searchParams;
  const tab = VALID_TABS.includes(params.tab as TabId)
    ? (params.tab as TabId)
    : "llm";

  return <AiPlaygroundSettingsClient language={language as "en" | "ja"} tab={tab} />;
}
