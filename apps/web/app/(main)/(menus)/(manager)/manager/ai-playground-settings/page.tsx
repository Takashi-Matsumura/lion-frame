import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { AiPlaygroundSettingsClient } from "./AiPlaygroundSettingsClient";

export const metadata: Metadata = {
  title: "AI Playground Settings",
};

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/dashboard");
  }

  const language = await getLanguage();
  return <AiPlaygroundSettingsClient language={language as "en" | "ja"} />;
}
