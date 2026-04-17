"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OidcClientsTranslation } from "../translations";

interface SecretRevealDialogProps {
  open: boolean;
  t: OidcClientsTranslation;
  clientId: string;
  clientSecret: string;
  onClose: () => void;
}

function CopyField({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API が使えない環境でも落ちない
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button type="button" variant="outline" onClick={handleCopy}>
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </div>
  );
}

export function SecretRevealDialog({
  open,
  t,
  clientId,
  clientSecret,
  onClose,
}: SecretRevealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.secretRevealTitle}</DialogTitle>
          <DialogDescription>{t.secretRevealDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <CopyField
            label={t.secretClientIdLabel}
            value={clientId}
            copyLabel={t.secretCopyButton}
            copiedLabel={t.secretCopied}
          />
          <CopyField
            label={t.secretClientSecretLabel}
            value={clientSecret}
            copyLabel={t.secretCopyButton}
            copiedLabel={t.secretCopied}
          />
        </div>

        <DialogFooter>
          <Button onClick={onClose}>{t.secretCloseButton}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
