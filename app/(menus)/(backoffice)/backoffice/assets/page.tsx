import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import AssetManagementClient from "./AssetManagementClient";
import { assetTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = assetTranslations[language];
  return { title: t.pageTitle };
}

export default async function AssetManagementPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const language = await getLanguage();
  return <AssetManagementClient language={language} />;
}
