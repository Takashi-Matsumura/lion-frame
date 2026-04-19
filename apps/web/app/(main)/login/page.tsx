import { Info } from "lucide-react";
import { CredentialsLoginForm } from "@/components/CredentialsLoginForm";
import { PasskeySignInButton } from "@/components/PasskeySignInButton";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getLanguage } from "@/lib/i18n/get-language";
import { loginTranslations } from "./translations";

// NOTE: Google / GitHub の OAuth ログインは、社内設置時のセットアップ負担
// （内部ドメイン準備・HTTPS 必須・OAuth Console 登録）が大きいため、
// ログイン画面からは非表示にしている。Provider 本体・管理画面のトグル・
// API ルート・環境変数はそのまま温存しているので、将来 UI を復活させる際は
// `<OAuthButtons />` の呼び出しと SystemSetting の読み込みを戻すだけで良い。

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  const language = await getLanguage();
  const t = loginTranslations[language];

  return (
    <div className="-my-8 min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">
        {/* サインインカード */}
        <Card className="shadow-xl">
          <CardContent className="pt-6">
            {/* システム更新メッセージ */}
            {reason === "system-update" && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>{t.systemUpdateMessage}</span>
              </div>
            )}

            {/* Credentials認証フォーム（常時表示） */}
            <CredentialsLoginForm language={language} />

            {/* パスキーサインイン（対応ブラウザでのみ表示） */}
            <div className="my-6 flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-sm text-muted-foreground font-medium">
                {t.or}
              </span>
              <Separator className="flex-1" />
            </div>
            <PasskeySignInButton language={language} />
          </CardContent>
        </Card>

        {/* フッター */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          © 2025 MatsBACCANO
        </p>
      </div>
    </div>
  );
}
