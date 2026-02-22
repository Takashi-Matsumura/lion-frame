import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import ApprovalsClient from "./ApprovalsClient";
import { approvalTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = approvalTranslations[language];
  return { title: t.pageTitle };
}

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
  if (!allowedRoles.includes(session.user.role || "")) {
    redirect("/dashboard");
  }

  const language = await getLanguage();
  return (
    <div className="max-w-5xl mx-auto">
      <ApprovalsClient language={language as "en" | "ja"} />
    </div>
  );
}
