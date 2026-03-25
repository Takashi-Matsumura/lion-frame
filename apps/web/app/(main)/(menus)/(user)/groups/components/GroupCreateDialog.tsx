"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "OFFICIAL" | "PERSONAL";
  onCreated: () => void;
  t: Record<string, string>;
}

function getCurrentFiscalYear(): number {
  const now = new Date();
  const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return jst.getMonth() + 1 >= 4 ? jst.getFullYear() : jst.getFullYear() - 1;
}

export function GroupCreateDialog({
  open,
  onOpenChange,
  type,
  onCreated,
  t,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fiscalYear, setFiscalYear] = useState<number>(getCurrentFiscalYear());
  const [isOngoing, setIsOngoing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        type,
      };
      if (type === "OFFICIAL") {
        body.fiscalYear = isOngoing ? null : fiscalYear;
      }
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setName("");
        setDescription("");
        setFiscalYear(getCurrentFiscalYear());
        setIsOngoing(false);
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.createGroup}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.groupName}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.groupName}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>{t.description}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.description}
            />
          </div>
          {type === "OFFICIAL" && (
            <div className="space-y-2">
              <Label>{t.fiscalYear}</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(parseInt(e.target.value, 10) || getCurrentFiscalYear())}
                  className="w-32"
                  disabled={isOngoing}
                />
                <span className="text-sm text-muted-foreground">{t.fiscalYearSuffix}</span>
                <label className="flex items-center gap-2 text-sm cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={isOngoing}
                    onChange={(e) => setIsOngoing(e.target.checked)}
                    className="rounded border-input"
                  />
                  {t.ongoingGroup}
                </label>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving} loading={saving}>
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
