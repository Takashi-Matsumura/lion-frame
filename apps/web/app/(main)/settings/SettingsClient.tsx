"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent } from "@/components/ui/card";
import { PasskeySection } from "./PasskeySection";
import { PasswordChangeSection } from "./PasswordChangeSection";
import { TwoFactorSection } from "./TwoFactorSection";
import type { settingsTranslations } from "./translations";
import { UserAccessKeySection } from "./UserAccessKeySection";

// Service Worker / Notification API 依存のためクライアント専用でレンダリング
// （SSR 時と初回クライアントレンダリングで useState の初期値由来のツリー差分が
//  sibling の Radix ID を drift させ、hydration mismatch を発生させるため）
const PushNotificationSection = dynamic(
  () => import("./PushNotificationSection").then((m) => m.PushNotificationSection),
  { ssr: false },
);

type SettingsTranslations =
  | (typeof settingsTranslations)["en"]
  | (typeof settingsTranslations)["ja"];

interface SettingsClientProps {
  language: "en" | "ja";
  translations: SettingsTranslations;
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
}

export function SettingsClient({
  language,
  translations: t,
  twoFactorEnabled: initialTwoFactorEnabled,
  mustChangePassword: initialMustChangePassword,
}: SettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as "basic" | "keys") || "basic";
  const passwordReset = searchParams.get("passwordReset") === "true";
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    initialTwoFactorEnabled,
  );
  const [mustChangePassword, setMustChangePassword] = useState(
    initialMustChangePassword,
  );

  const handleTwoFactorStatusChange = useCallback(() => {
    setTwoFactorEnabled((prev) => !prev);
  }, []);

  const handlePasswordChanged = useCallback(() => {
    setMustChangePassword(false);
    // URLからpasswordReset パラメータを削除
    if (passwordReset) {
      router.replace("/settings");
    }
  }, [passwordReset, router]);

  return (
    <div className="max-w-4xl mx-auto">
      {activeTab === "basic" && (
        <div className="space-y-6">
          {/* Password Change Section */}
          <Card>
            <CardContent className="pt-6">
              <PasswordChangeSection
                translations={t.passwordChange}
                mustChangePassword={mustChangePassword || passwordReset}
                onPasswordChanged={handlePasswordChanged}
              />
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardContent className="pt-6">
              <LanguageSwitcher
                currentLanguage={language}
                translations={t.language}
              />
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card>
            <CardContent className="pt-6">
              <PushNotificationSection
                translations={t.pushNotification}
              />
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardContent className="pt-6">
              <TwoFactorSection
                isEnabled={twoFactorEnabled}
                translations={t.twoFactor}
                onStatusChange={handleTwoFactorStatusChange}
              />
            </CardContent>
          </Card>

          {/* Passkeys */}
          <Card>
            <CardContent className="pt-6">
              <PasskeySection language={language} translations={t.passkey} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "keys" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <UserAccessKeySection language={language} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
