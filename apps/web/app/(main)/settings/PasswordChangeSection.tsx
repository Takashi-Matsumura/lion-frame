"use client";

import { signOut } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiMagicLine,
} from "react-icons/ri";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePassword } from "@/lib/password/generator";
import {
  MIN_PASSWORD_LENGTH,
  validatePassword,
  type ValidationError,
} from "@/lib/password/validator";
import { PasskeySection } from "./PasskeySection";
import type { settingsTranslations } from "./translations";

interface PasswordChangeTranslations {
  title: string;
  description: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  changeButton: string;
  generateButton: string;
  generateCopied: string;
  strengthLabel: string;
  strengthWeak: string;
  strengthMedium: string;
  strengthStrong: string;
  success: string;
  successLoggingOut: string;
  error: string;
  passwordMismatch: string;
  passwordTooShort: string;
  errorTooLong: string;
  errorBlacklisted: string;
  errorContainsUserInfo: string;
  errorRepeatedChars: string;
  showPassword: string;
  hidePassword: string;
  mustChangeWarning: string;
}

type PasskeyTranslationsFromSettings =
  | (typeof settingsTranslations)["en"]["passkey"]
  | (typeof settingsTranslations)["ja"]["passkey"];

interface PasswordChangeSectionProps {
  translations: PasswordChangeTranslations;
  passkeyTranslations: PasskeyTranslationsFromSettings;
  language: "en" | "ja";
  mustChangePassword: boolean;
  userContext?: { email?: string | null; name?: string | null };
  onPasswordChanged?: () => void;
}

function translateError(
  err: ValidationError,
  t: PasswordChangeTranslations,
): string {
  switch (err) {
    case "TOO_SHORT":
      return t.passwordTooShort;
    case "TOO_LONG":
      return t.errorTooLong;
    case "BLACKLISTED":
      return t.errorBlacklisted;
    case "CONTAINS_USER_INFO":
      return t.errorContainsUserInfo;
    case "REPEATED_CHARS":
      return t.errorRepeatedChars;
  }
}

export function PasswordChangeSection({
  translations: t,
  passkeyTranslations,
  language,
  mustChangePassword,
  userContext,
  onPasswordChanged,
}: PasswordChangeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(mustChangePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strengthInfo = useMemo(() => {
    if (!newPassword) return null;
    return validatePassword(newPassword, userContext);
  }, [newPassword, userContext]);

  const handleGenerate = useCallback(async () => {
    const pw = generatePassword(16);
    setNewPassword(pw);
    setConfirmPassword(pw);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    setError(null);
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // clipboard API が失敗しても入力欄には反映されているので続行
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);

      const result = validatePassword(newPassword, userContext);
      if (!result.valid && result.errors.length > 0) {
        setError(translateError(result.errors[0], t));
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(t.passwordMismatch);
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: mustChangePassword ? undefined : currentPassword,
            newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.errorJa || data.error || t.error);
          return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        if (mustChangePassword) {
          setSuccess(true);
          setIsSubmitting(true);
          setTimeout(() => {
            signOut({ callbackUrl: "/login" });
          }, 2000);
          return;
        }

        setSuccess(true);
        onPasswordChanged?.();
      } catch {
        setError(t.error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      currentPassword,
      newPassword,
      confirmPassword,
      mustChangePassword,
      userContext,
      t,
      onPasswordChanged,
    ],
  );

  const strengthBarWidth =
    strengthInfo?.strength === "strong"
      ? "w-full"
      : strengthInfo?.strength === "medium"
        ? "w-2/3"
        : "w-1/3";
  const strengthBarColor =
    strengthInfo?.strength === "strong"
      ? "bg-green-500"
      : strengthInfo?.strength === "medium"
        ? "bg-yellow-500"
        : "bg-red-500";
  const strengthLabel =
    strengthInfo?.strength === "strong"
      ? t.strengthStrong
      : strengthInfo?.strength === "medium"
        ? t.strengthMedium
        : t.strengthWeak;

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left h-auto p-0 hover:bg-transparent"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold">{t.title}</h3>
          {mustChangePassword && <Badge variant="destructive">!</Badge>}
        </div>
        <RiArrowDownSLine
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </Button>
      <p className="text-sm text-muted-foreground mt-1">{t.description}</p>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[3000px] opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        {mustChangePassword && (
          <Alert
            variant="default"
            className="mb-4 border-amber-200 bg-amber-50 text-amber-800"
          >
            <RiAlertLine className="h-4 w-4" />
            <AlertDescription>{t.mustChangeWarning}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert
            variant="default"
            className="mb-4 border-green-200 bg-green-50 text-green-800"
          >
            <RiCheckLine className="h-4 w-4" />
            <AlertDescription>
              {mustChangePassword ? t.successLoggingOut : t.success}
            </AlertDescription>
          </Alert>
        )}

        {copied && (
          <Alert
            variant="default"
            className="mb-4 border-blue-200 bg-blue-50 text-blue-800"
          >
            <RiFileCopyLine className="h-4 w-4" />
            <AlertDescription>{t.generateCopied}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <RiCloseLine className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!mustChangePassword && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t.currentPassword}</Label>
              <Input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required={!mustChangePassword}
                autoComplete="current-password"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="newPassword">{t.newPassword}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                className="gap-1"
              >
                <RiMagicLine className="w-3.5 h-3.5" />
                {t.generateButton}
              </Button>
            </div>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className={`pr-10 ${showNewPassword ? "font-mono" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? t.hidePassword : t.showPassword}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <RiEyeOffLine className="w-4 h-4" />
                ) : (
                  <RiEyeLine className="w-4 h-4" />
                )}
              </button>
            </div>
            {strengthInfo && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${strengthBarWidth} ${strengthBarColor}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {t.strengthLabel}: {strengthLabel}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className={`pr-10 ${showConfirmPassword ? "font-mono" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={
                  showConfirmPassword ? t.hidePassword : t.showPassword
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <RiEyeOffLine className="w-4 h-4" />
                ) : (
                  <RiEyeLine className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
            {t.changeButton}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t">
          <PasskeySection
            language={language}
            translations={passkeyTranslations}
          />
        </div>
      </div>
    </div>
  );
}
