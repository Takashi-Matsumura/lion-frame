"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

const translations = {
  en: {
    title: "Enter your seat number",
    description: "Enter a number between 1 and {max}",
    namePlaceholder: "Your name",
    nameLabel: "Display name",
    start: "Join Session",
    back: "Back",
    error: "Please enter a valid seat number (1-{max})",
    nameError: "Please enter your name",
  },
  ja: {
    title: "座席番号を入力してください",
    description: "1〜{max}の番号を入力してください",
    namePlaceholder: "あなたの名前",
    nameLabel: "表示名",
    start: "セッションに参加",
    back: "戻る",
    error: "1〜{max}の番号を入力してください",
    nameError: "名前を入力してください",
  },
};

interface Props {
  language: "en" | "ja";
  maxSeats: number;
  sessionTitle?: string;
  defaultName?: string;
  onSubmit: (seatNumber: number, displayName: string) => Promise<string | null>;
  onBack?: () => void;
}

export default function SeatSelectionDialog({
  language,
  maxSeats,
  sessionTitle,
  defaultName = "",
  onSubmit,
  onBack,
}: Props) {
  const t = translations[language];
  const [seatValue, setSeatValue] = useState("");
  const [nameValue, setNameValue] = useState(defaultName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(seatValue, 10);
    if (isNaN(num) || num < 1 || num > maxSeats) {
      setError(t.error.replace("{max}", String(maxSeats)));
      return;
    }
    if (!nameValue.trim()) {
      setError(t.nameError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const errorMsg = await onSubmit(num, nameValue.trim());
      if (errorMsg) {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-card p-8 shadow-xl"
      >
        {sessionTitle && (
          <p className="mb-2 text-sm font-medium text-primary">{sessionTitle}</p>
        )}
        <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.description.replace("{max}", String(maxSeats))}
        </p>

        <input
          type="number"
          min={1}
          max={maxSeats}
          value={seatValue}
          onChange={(e) => {
            setSeatValue(e.target.value);
            setError("");
          }}
          autoFocus
          className="mt-4 w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-2xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder=""
        />

        <label className="mt-4 block text-sm font-medium text-foreground">
          {t.nameLabel}
        </label>
        <input
          type="text"
          value={nameValue}
          onChange={(e) => {
            setNameValue(e.target.value);
            setError("");
          }}
          className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder={t.namePlaceholder}
        />

        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          className="mt-4 w-full"
          disabled={loading}
        >
          {loading ? "..." : t.start}
        </Button>
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            className="mt-2 w-full"
            onClick={onBack}
          >
            {t.back}
          </Button>
        )}
      </form>
    </div>
  );
}
