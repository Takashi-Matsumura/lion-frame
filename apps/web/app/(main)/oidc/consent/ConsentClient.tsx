"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { oidcConsentTranslations } from "./translations";

interface ConsentClientProps {
  handle: string;
  clientName: string;
  clientDescription: string | null;
  scope: string;
  language: "en" | "ja";
}

function describeScope(
  scope: string,
  t: (typeof oidcConsentTranslations)["en"],
): string {
  switch (scope) {
    case "openid":
      return t.scopeHintOpenid;
    case "profile":
      return t.scopeHintProfile;
    case "email":
      return t.scopeHintEmail;
    default:
      return t.scopeHintOther;
  }
}

export function ConsentClient({
  handle,
  clientName,
  clientDescription,
  scope,
  language,
}: ConsentClientProps) {
  const t = oidcConsentTranslations[language];
  const [submitting, setSubmitting] = useState(false);

  const scopes = scope.split(/\s+/).filter(Boolean);

  const submit = async (approve: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/oidc/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, approve }),
      });
      const data = (await res.json()) as { redirectTo?: string; error?: string };
      if (!res.ok || !data.redirectTo) {
        toast.error(t.errorApprove);
        setSubmitting(false);
        return;
      }
      window.location.href = data.redirectTo;
    } catch {
      toast.error(t.errorApprove);
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs text-muted-foreground">{t.clientLabel}</div>
          <div className="font-medium text-lg">{clientName}</div>
          {clientDescription && (
            <div className="text-sm text-muted-foreground">
              {clientDescription}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            {t.scopeLabel}
          </div>
          <ul className="space-y-1 text-sm">
            {scopes.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">
                  {s}
                </span>
                <span>{describeScope(s, t)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => submit(false)}
        >
          {t.denyButton}
        </Button>
        <Button disabled={submitting} onClick={() => submit(true)}>
          {t.approveButton}
        </Button>
      </CardFooter>
    </Card>
  );
}
