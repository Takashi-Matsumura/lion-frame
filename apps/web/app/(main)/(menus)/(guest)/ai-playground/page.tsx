import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { AiPlaygroundPage } from "@lionframe/addon-ai-playground/pages/AiPlaygroundPage";

export const metadata: Metadata = {
  title: "AI Playground",
};

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const language = await getLanguage();
  return <AiPlaygroundPage language={language as "en" | "ja"} />;
}
