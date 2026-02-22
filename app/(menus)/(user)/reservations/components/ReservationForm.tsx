"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { reservationTranslations } from "../translations";

interface ReservationFormProps {
  language: "en" | "ja";
  resourceId: string;
  resourceName: string;
  initialDate?: string;
  initialStart?: string;
  initialEnd?: string;
  onSave: () => void;
  onCancel: () => void;
}

export default function ReservationForm({
  language,
  resourceId,
  resourceName,
  initialDate,
  initialStart,
  initialEnd,
  onSave,
  onCancel,
}: ReservationFormProps) {
  const t = reservationTranslations[language];
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Tokyo",
  });

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate || today);
  const [startTime, setStartTime] = useState(initialStart || "09:00");
  const [endTime, setEndTime] = useState(initialEnd || "10:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (start >= end) {
      setError(t.invalidTimeRange);
      return;
    }

    if (date < today) {
      setError(t.pastDate);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/general-affairs/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId,
          title: title.trim(),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        if (res.status === 409) {
          setError(t.conflict);
        } else if (data.error === "PAST_DATE") {
          setError(t.pastDate);
        } else {
          setError(data.error || t.saveError);
        }
      }
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">{t.title} *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.title}
          required
          className="text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t.date}</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={today}
          className="text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t.startTime}
          </label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            step={900}
            className="text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t.endTime}
          </label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            step={900}
            className="text-base"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" disabled={saving || !title.trim()}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          {t.makeReservation}
        </Button>
      </div>
    </form>
  );
}
