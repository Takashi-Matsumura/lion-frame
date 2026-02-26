"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/Icons";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { calendarManagementTranslations } from "../translations";

interface CalendarSettings {
  calendar_week_start: "sunday" | "monday";
  calendar_default_view: "single" | "dual";
  calendar_working_hours_start: string;
  calendar_working_hours_end: string;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  calendar_week_start: "sunday",
  calendar_default_view: "dual",
  calendar_working_hours_start: "09:00",
  calendar_working_hours_end: "18:00",
};

interface CalendarSettingsTabProps {
  language: "en" | "ja";
}

export function CalendarSettingsTab({ language }: CalendarSettingsTabProps) {
  const t = calendarManagementTranslations[language].settings;
  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: t.saved });
      } else {
        setMessage({ type: "error", text: t.error });
      }
    } catch {
      setMessage({ type: "error", text: t.error });
    } finally {
      setSaving(false);
    }
  }, [settings, t]);

  if (loading) {
    return (
      <PageSkeleton contentHeight="h-[300px]" className="max-w-3xl mx-auto" />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 h-full flex flex-col gap-6">
      <p className="text-sm text-muted-foreground shrink-0">{t.description}</p>

      <div className="space-y-6 flex-1">
        {/* 週の開始曜日 */}
        <div className="space-y-2">
          <Label>{t.weekStart}</Label>
          <Select
            value={settings.calendar_week_start}
            onValueChange={(val) =>
              setSettings((s) => ({
                ...s,
                calendar_week_start: val as "sunday" | "monday",
              }))
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sunday">{t.sunday}</SelectItem>
              <SelectItem value="monday">{t.monday}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* デフォルト表示 */}
        <div className="space-y-2">
          <Label>{t.defaultView}</Label>
          <Select
            value={settings.calendar_default_view}
            onValueChange={(val) =>
              setSettings((s) => ({
                ...s,
                calendar_default_view: val as "single" | "dual",
              }))
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">{t.singleMonth}</SelectItem>
              <SelectItem value="dual">{t.dualMonth}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 営業時間 */}
        <div className="flex gap-6">
          <div className="space-y-2">
            <Label>{t.workingHoursStart}</Label>
            <Input
              type="time"
              value={settings.calendar_working_hours_start}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  calendar_working_hours_start: e.target.value,
                }))
              }
              className="w-[160px]"
            />
          </div>
          <div className="space-y-2">
            <Label>{t.workingHoursEnd}</Label>
            <Input
              type="time"
              value={settings.calendar_working_hours_end}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  calendar_working_hours_end: e.target.value,
                }))
              }
              className="w-[160px]"
            />
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex items-center gap-3 shrink-0">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <LoadingSpinner className="w-4 h-4 mr-1" />}
          {saving ? t.saving : t.save}
        </Button>
        {message && (
          <span
            className={`text-sm font-medium ${
              message.type === "success"
                ? "text-green-600 dark:text-green-400"
                : "text-destructive"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
