import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { AuditLogsSkeleton } from "./AuditLogsSkeleton";
import { auditLogsTranslations } from "./translations";

// bundle-dynamic-imports: 重い監査ログコンポーネントを遅延読み込み
const AuditLogsClient = dynamic(
  () =>
    import("./AuditLogsClient").then((m) => ({
      default: m.AuditLogsClient,
    })),
  { loading: () => <AuditLogsSkeleton /> },
);

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = auditLogsTranslations[language];

  return {
    title: t.title,
  };
}

export default async function AuditLogsPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const language = await getLanguage();

  return <AuditLogsClient language={language as "en" | "ja"} />;
}
