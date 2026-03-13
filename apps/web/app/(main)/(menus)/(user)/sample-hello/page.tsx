/**
 * プロキシページ: 外部アドオン @lionframe/addon-sample-hello
 *
 * Next.js App Router はファイルシステムベースのルーティングのため、
 * 外部アドオンのページコンポーネントをここで re-export する。
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { SampleHelloPage } from "@lionframe/addon-sample-hello/pages/SampleHelloPage";

export default async function Page() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const language = await getLanguage();

  return <SampleHelloPage language={language} />;
}
