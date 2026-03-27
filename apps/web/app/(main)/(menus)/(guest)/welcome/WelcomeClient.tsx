"use client";

import { RiShieldUserLine } from "react-icons/ri";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

const translations = {
  en: {
    greeting: "Welcome to LionFrame",
    description:
      "You are logged in as a guest. Please contact your administrator if you need additional access.",
    role: "Guest",
    infoTitle: "About Guest Access",
    infoItems: [
      "Your account has limited access",
      "Contact your administrator to upgrade your role",
      "Some features may become available as they are assigned to you",
    ],
  },
  ja: {
    greeting: "LionFrame へようこそ",
    description:
      "ゲストとしてログインしています。追加のアクセス権が必要な場合は、管理者にお問い合わせください。",
    role: "ゲスト",
    infoTitle: "ゲストアクセスについて",
    infoItems: [
      "このアカウントは限定されたアクセス権を持っています",
      "ロールの変更が必要な場合は管理者にお問い合わせください",
      "割り当てられた機能が利用可能になる場合があります",
    ],
  },
};

export function WelcomeClient({
  language,
  userName,
}: {
  language: "en" | "ja";
  userName: string;
}) {
  const t = translations[language];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <RiShieldUserLine className="w-8 h-8 text-gray-500 dark:text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t.greeting}</h1>
        {userName && (
          <p className="text-lg text-muted-foreground mb-1">{userName}</p>
        )}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {t.role}
        </span>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-6">{t.description}</p>
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">{t.infoTitle}</h3>
            <ul className="space-y-2">
              {t.infoItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
