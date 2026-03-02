import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { AIChatSkeleton } from "./AIChatSkeleton";
import { aiChatTranslations } from "./translations";

// bundle-dynamic-imports: 重いAIチャットコンポーネントを遅延読み込み
const AIChatClient = dynamic(
  () => import("./AIChatClient").then((m) => ({ default: m.AIChatClient })),
  { loading: () => <AIChatSkeleton /> },
);

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = aiChatTranslations[language];

  return {
    title: t.title,
  };
}

export default async function AIChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const language = await getLanguage();
  const userName =
    session.user.name || session.user.email?.split("@")[0] || "User";

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col -mt-4">
      <AIChatClient language={language as "en" | "ja"} userName={userName} />
    </div>
  );
}
