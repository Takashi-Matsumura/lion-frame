import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { CalendarSettingsSkeleton } from "./CalendarManagementSkeleton";
import { calendarManagementTranslations } from "./translations";

// bundle-dynamic-imports: 重いカレンダー管理コンポーネントを遅延読み込み
const CalendarManagementClient = dynamic(
  () =>
    import("./CalendarManagementClient").then((m) => ({
      default: m.CalendarManagementClient,
    })),
  { loading: () => <CalendarSettingsSkeleton /> },
);

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = calendarManagementTranslations[language];
  return { title: t.title };
}

export default async function CalendarManagementPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = (await getLanguage()) as "en" | "ja";

  return <CalendarManagementClient language={language} />;
}
