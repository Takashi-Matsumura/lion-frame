import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { OrganizationChartSkeleton } from "./OrganizationChartSkeleton";
import type { Language } from "./translations";

// bundle-dynamic-imports: 重い組織図コンポーネントを遅延読み込み
const OrganizationChartClient = dynamic(
  () => import("./OrganizationChartClient").then((m) => ({ default: m.OrganizationChartClient })),
  { loading: () => <OrganizationChartSkeleton /> },
);

export default async function OrganizationChartPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;
  const userRole = session.user?.role ?? "USER";

  return <OrganizationChartClient language={language} userRole={userRole} />;
}
