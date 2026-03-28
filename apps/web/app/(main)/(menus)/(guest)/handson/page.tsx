import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { getUserAccessKeyPermissions } from "@/lib/access-keys";
import HandsonClient from "./HandsonClient";

const translations = {
  en: { title: "Hands-on" },
  ja: { title: "ハンズオン" },
};

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = translations[language as "en" | "ja"] || translations.en;
  return { title: t.title };
}

export default async function HandsonPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const language = await getLanguage();
  const role = session.user.role as string;

  // アクセスキーによる講師権限チェック
  let hasHandsonAccessKey = false;
  if (role !== "GUEST") {
    const akPerms = await getUserAccessKeyPermissions(session.user.id);
    hasHandsonAccessKey = akPerms.menuPaths.includes("/handson");
  }

  return (
    <HandsonClient
      language={language as "en" | "ja"}
      userRole={role}
      userId={session.user.id}
      userName={session.user.name || ""}
      hasHandsonAccessKey={hasHandsonAccessKey}
    />
  );
}
