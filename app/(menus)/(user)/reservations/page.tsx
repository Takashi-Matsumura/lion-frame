import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import ReservationsClient from "./ReservationsClient";
import { reservationTranslations } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = reservationTranslations[language];
  return { title: t.pageTitle };
}

export default async function ReservationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const language = await getLanguage();
  return (
    <div className="max-w-7xl mx-auto">
      <ReservationsClient language={language as "en" | "ja"} />
    </div>
  );
}
