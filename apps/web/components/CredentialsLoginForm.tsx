"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useState } from "react";
import { RiLoginBoxLine } from "react-icons/ri";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeCallbackUrl } from "@/lib/services/safe-redirect";

const translations = {
  en: {
    email: "Email",
    password: "Password",
    emailPlaceholder: "Email address",
    passwordPlaceholder: "Password",
    signInButton: "Sign In",
    signingIn: "Signing in...",
    loginError: "Login failed. Please check your email or password.",
    systemError: "An error occurred during login.",
  },
  ja: {
    email: "メールアドレス",
    password: "パスワード",
    emailPlaceholder: "メールアドレス",
    passwordPlaceholder: "パスワード",
    signInButton: "サインイン",
    signingIn: "ログイン中...",
    loginError:
      "ログインに失敗しました。メールアドレスまたはパスワードを確認してください。",
    systemError: "ログイン中にエラーが発生しました。",
  },
} as const;

interface CredentialsLoginFormProps {
  language?: "en" | "ja";
}

export function CredentialsLoginForm({
  language = "ja",
}: CredentialsLoginFormProps) {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(
    searchParams?.get("callbackUrl"),
    "/",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const t = translations[language];

  // 全角→半角変換（IME確定時に自動適用）
  const toHalfWidth = useCallback((str: string) => {
    return str
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
      )
      .replace(/[＠．＿＋－]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
      );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t.loginError);
      } else if (result?.ok) {
        // callbackUrl が /api/oidc/authorize?resume=... のような API Route を
        // 含む場合、router.push は SPA 遷移を試みつつ refresh で 2 回目の GET
        // を誘発しうる。full navigation で 1 回の GET に揃える (Issue #26)。
        window.location.assign(callbackUrl);
      }
    } catch (err) {
      console.error("Credentials login error:", err);
      setError(t.systemError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="credentials-email">{t.email}</Label>
        <Input
          id="credentials-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          style={{ imeMode: "disabled" }}
          value={email}
          onChange={(e) => setEmail(toHalfWidth(e.target.value))}
          onCompositionEnd={(e) => {
            const target = e.target as HTMLInputElement;
            setEmail(toHalfWidth(target.value));
          }}
          required
          placeholder={t.emailPlaceholder}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="credentials-password">{t.password}</Label>
        <Input
          id="credentials-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder={t.passwordPlaceholder}
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={isLoading}
        loading={isLoading}
      >
        <RiLoginBoxLine className="w-5 h-5" />
        {isLoading ? t.signingIn : t.signInButton}
      </Button>
    </form>
  );
}
