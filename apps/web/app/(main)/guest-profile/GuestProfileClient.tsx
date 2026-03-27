"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { RiShieldUserLine } from "react-icons/ri";
import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
const LANGUAGE_COOKIE_NAME = "lionframe-language";

const translations = {
  en: {
    title: "Guest Profile",
    subtitle: "You are logged in with a temporary guest account",
    accountInfo: "Account Information",
    name: "Name",
    email: "Email",
    role: "Role",
    guestRole: "Guest",
    temporaryNotice: "Temporary Account",
    temporaryDescription:
      "This is a temporary guest account. Settings are stored in your browser and will not be shared with other users.",
    languageSettings: "Language Settings",
    languageDescription: "Select your preferred display language",
    currentLanguage: "Current language",
    english: "English",
    japanese: "日本語",
    save: "Save Language",
    saved: "Saved",
  },
  ja: {
    title: "ゲストプロフィール",
    subtitle: "一時的なゲストアカウントでログインしています",
    accountInfo: "アカウント情報",
    name: "名前",
    email: "メール",
    role: "ロール",
    guestRole: "ゲスト",
    temporaryNotice: "一時アカウント",
    temporaryDescription:
      "これは一時的なゲストアカウントです。設定はブラウザに保存され、他のユーザーとは共有されません。",
    languageSettings: "言語設定",
    languageDescription: "表示言語を選択してください",
    currentLanguage: "現在の言語",
    english: "English",
    japanese: "日本語",
    save: "言語を保存",
    saved: "保存しました",
  },
};

export function GuestProfileClient({
  language,
  userName,
  email,
}: {
  language: "en" | "ja";
  userName: string;
  email: string;
}) {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [saved, setSaved] = useState(false);
  const t = translations[language];

  const handleSave = useCallback(() => {
    // Cookieに保存（1年間有効）
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${selectedLanguage};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // ページをリロードして言語変更を反映
    router.refresh();
  }, [selectedLanguage, router]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <RiShieldUserLine className="w-7 h-7 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      {/* 一時アカウント通知 */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {t.temporaryNotice}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {t.temporaryDescription}
            </p>
          </div>
        </div>
      </div>

      {/* アカウント情報 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.accountInfo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t.name}</span>
            <span className="text-sm font-medium">{userName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t.email}</span>
            <span className="text-sm font-medium">{email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t.role}</span>
            <Badge variant="secondary">{t.guestRole}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 言語設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t.languageSettings}
          </CardTitle>
          <CardDescription>{t.languageDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="language"
                value="en"
                checked={selectedLanguage === "en"}
                onChange={() => setSelectedLanguage("en")}
                className="accent-primary"
              />
              <span className="text-sm font-medium">{t.english}</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="language"
                value="ja"
                checked={selectedLanguage === "ja"}
                onChange={() => setSelectedLanguage("ja")}
                className="accent-primary"
              />
              <span className="text-sm font-medium">{t.japanese}</span>
            </label>
          </div>
          <Button
            onClick={handleSave}
            disabled={selectedLanguage === language}
            variant={saved ? "outline" : "default"}
          >
            {saved ? t.saved : t.save}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
