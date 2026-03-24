import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { prisma } from "@/lib/prisma";
import { EditorClient } from "./EditorClient";
import { editorTranslations, type Language } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = editorTranslations[language];
  return { title: t.title };
}

export default async function EditorPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;
  const pdfSetting = await prisma.systemSetting.findUnique({
    where: { key: "module_enabled_pdf" },
  });
  // DBに設定がない場合はモジュールのデフォルト（true）を使用
  const pdfEnabled = pdfSetting ? pdfSetting.value === "true" : true;
  return <EditorClient language={language} pdfEnabled={pdfEnabled} />;
}
