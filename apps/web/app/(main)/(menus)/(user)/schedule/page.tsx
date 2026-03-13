import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { ScheduleSkeleton } from "./ScheduleSkeleton";
import { scheduleTranslations, type Language } from "./translations";

// bundle-dynamic-imports: 重いカレンダーコンポーネントを遅延読み込み
const ScheduleClient = dynamic(
  () => import("./ScheduleClient").then((m) => ({ default: m.ScheduleClient })),
  { loading: () => <ScheduleSkeleton /> },
);

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = scheduleTranslations[language];
  return { title: t.title };
}

export default async function SchedulePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;

  return <ScheduleClient language={language} />;
}
