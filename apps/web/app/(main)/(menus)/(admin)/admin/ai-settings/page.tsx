import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { AiSettingsClient } from "./AiSettingsClient";

export const metadata: Metadata = {
  title: "AI Settings",
};

type TabId = "general" | "playground";
const VALID_TABS: TabId[] = ["general", "playground"];

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
    : "general";

  return <AiSettingsClient language={language as "en" | "ja"} tab={tab} />;
}
