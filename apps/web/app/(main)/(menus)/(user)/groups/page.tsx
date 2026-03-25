import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { GroupsSkeleton } from "./GroupsSkeleton";
import type { Language } from "./translations";

const GroupsClient = dynamic(
  () => import("./GroupsClient").then((m) => ({ default: m.GroupsClient })),
  { loading: () => <GroupsSkeleton /> },
);

export default async function GroupsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const language = (await getLanguage()) as Language;
  const userRole = session.user?.role ?? "USER";
  const userId = session.user?.id ?? "";

  return <GroupsClient language={language} userRole={userRole} userId={userId} />;
}
