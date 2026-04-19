"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { RiFingerprintLine } from "react-icons/ri";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sanitizeCallbackUrl } from "@/lib/services/safe-redirect";

const translations = {
  en: {
    signInWithPasskey: "Sign in with a passkey",
    passkeyError: "Passkey sign-in failed. Please try again.",
    passkeyCancelled: "Passkey sign-in was cancelled.",
  },
  ja: {
    signInWithPasskey: "パスキーでサインイン",
    passkeyError: "パスキーでのサインインに失敗しました。",
    passkeyCancelled: "パスキーのサインインがキャンセルされました。",
  },
} as const;

interface PasskeySignInButtonProps {
  language?: "en" | "ja";
}

export function PasskeySignInButton({
  language = "ja",
}: PasskeySignInButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams?.get("callbackUrl"), "/");
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = translations[language];

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
  }, []);

  const handleSignIn = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const optionsRes = await fetch("/api/auth/webauthn/options", {
        method: "POST",
      });
      if (!optionsRes.ok) throw new Error("options");
      const options = await optionsRes.json();

      const assertion = await startAuthentication({ optionsJSON: options });

      const result = await signIn("webauthn", {
        assertion: JSON.stringify(assertion),
        redirect: false,
      });

      if (result?.error) {
        setError(t.passkeyError);
        return;
      }
      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "AbortError") {
        setError(t.passkeyCancelled);
      } else {
        setError(t.passkeyError);
      }
    } finally {
      setBusy(false);
    }
  }, [callbackUrl, router, t]);

  if (!supported) return null;

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        size="lg"
        variant="outline"
        className="w-full gap-2"
        onClick={handleSignIn}
        disabled={busy}
        loading={busy}
      >
        <RiFingerprintLine className="w-5 h-5" />
        {t.signInWithPasskey}
      </Button>
    </div>
  );
}
