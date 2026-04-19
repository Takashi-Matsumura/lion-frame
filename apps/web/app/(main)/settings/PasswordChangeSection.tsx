"use client";

import { signOut } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
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
  errorBlacklisted: string;
  errorContainsUserInfo: string;
  errorRepeatedChars: string;
  mustChangeWarning: string;
}

interface PasswordChangeSectionProps {
  translations: PasswordChangeTranslations;
  mustChangePassword: boolean;
  onPasswordChanged?: () => void;
}

function translateError(
  err: ValidationError,
  t: PasswordChangeTranslations,
): string {
  switch (err) {
    case "TOO_SHORT":
      return t.passwordTooShort;
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
  mustChangePassword,
  onPasswordChanged,
}: PasswordChangeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(mustChangePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strengthInfo = useMemo(() => {
    if (!newPassword) return null;
    return validatePassword(newPassword);
  }, [newPassword]);

  const handleGenerate = useCallback(async () => {
    const pw = generatePassword(16);
    setNewPassword(pw);
    setConfirmPassword(pw);
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

      const result = validatePassword(newPassword);
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
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
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
      </button>
      <p className="text-sm text-muted-foreground mt-1">{t.description}</p>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[900px] opacity-100 mt-4" : "max-h-0 opacity-0"
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
            <Input
              type="text"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="font-mono"
            />
            {strengthInfo && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${strengthBarWidth} ${strengthBarColor}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {t.strengthLabel}: {strengthLabel}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
            <Input
              type="text"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="font-mono"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
            {t.changeButton}
          </Button>
        </form>
      </div>
    </div>
  );
}
