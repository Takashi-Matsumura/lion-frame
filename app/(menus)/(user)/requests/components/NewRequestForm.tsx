"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { requestTranslations } from "../translations";

interface LeaveType {
  id: string;
  name: string;
  nameJa: string;
  maxDays: number | null;
}

interface Template {
  id: string;
  name: string;
  nameJa: string;
  category: string;
}

interface NewRequestFormProps {
  language: "en" | "ja";
  onSubmitted: () => void;
}

export default function NewRequestForm({
  language,
  onSubmitted,
}: NewRequestFormProps) {
  const t = requestTranslations[language];
  const [templates, setTemplates] = useState<Template[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [templatesRes, leaveTypesRes] = await Promise.all([
        fetch("/api/admin/workflow/templates"),
        fetch("/api/workflow/leave-types"),
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data);
        // Auto-select if only one leave template
        const leaveTemplates = data.filter(
          (t: Template) => t.category === "LEAVE",
        );
        if (leaveTemplates.length === 1) {
          setSelectedTemplateId(leaveTemplates[0].id);
        }
      }

      if (leaveTypesRes.ok) {
        const data = await leaveTypesRes.json();
        setLeaveTypes(data);
      }
    } catch {
      // Templates may not be accessible if not ADMIN - use leave types only
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const isLeave = selectedTemplate?.category === "LEAVE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;

    setSubmitting(true);
    setError("");

    try {
      const selectedLeave = leaveTypes.find((lt) => lt.id === leaveTypeId);
      const leaveLabel =
        language === "ja" ? selectedLeave?.nameJa : selectedLeave?.name;
      const title = isLeave
        ? `${language === "ja" ? "休暇申請" : "Leave Request"}: ${leaveLabel || ""}`
        : `${language === "ja" ? "申請" : "Request"}`;

      const formData: Record<string, unknown> = {};
      if (isLeave) {
        formData.leaveTypeId = leaveTypeId;
        formData.leaveTypeName =
          language === "ja" ? selectedLeave?.nameJa : selectedLeave?.name;
        formData.startDate = startDate;
        formData.endDate = endDate;
        formData.reason = reason;
      }

      const res = await fetch("/api/workflow/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          title,
          formData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.submitError);
      }

      // Reset form
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate days
  const dayCount =
    startDate && endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        )
      : 0;

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template selection - only show if multiple */}
        {templates.length > 1 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.selectType}
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              required
            >
              <option value="">{t.selectType}</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {language === "ja" ? tmpl.nameJa : tmpl.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Leave-specific fields */}
        {(isLeave || templates.length <= 1) && (
          <>
            {/* Leave type */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t.leaveType}
              </label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                required
              >
                <option value="">{t.selectLeaveType}</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {language === "ja" ? lt.nameJa : lt.name}
                    {lt.maxDays
                      ? ` (${language === "ja" ? "最大" : "max"} ${lt.maxDays}${t.days})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t.startDate}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate || e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t.endDate}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  required
                />
              </div>
            </div>

            {dayCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {dayCount}
                {t.days}
              </p>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t.reason}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.reasonPlaceholder}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          disabled={submitting || !selectedTemplateId}
        >
          {submitting ? t.submitting : t.submit}
        </Button>
      </form>
    </div>
  );
}
