"use client";

import { useState, useEffect } from "react";
import { handsonTranslations } from "./translations";
import { fetchAnalytics as apiFetchAnalytics } from "./api";
import type { Language, AnalyticsData } from "./types";
import KpiCards from "./analytics/KpiCards";
import ParticipantTable from "./analytics/ParticipantTable";
import ErrorHotspots from "./analytics/ErrorHotspots";
import HelpDistribution from "./analytics/HelpDistribution";
import InstructorTimeline from "./analytics/InstructorTimeline";
import RawDataTable from "./analytics/RawDataTable";
import { SessionAnalyticsSkeleton } from "./skeletons";

interface Props {
  language: Language;
  sessionId: string;
}

export default function SessionAnalytics({ language, sessionId }: Props) {
  const t = handsonTranslations[language].analytics;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<"chart" | "raw">("chart");

  useEffect(() => {
    (async () => {
      try {
        const result = await apiFetchAnalytics(sessionId);
        setData(result);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading) {
    return <SessionAnalyticsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">{t.error}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 表示モード切替 */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setViewMode("chart")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            viewMode === "chart"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.chartView}
        </button>
        <button
          onClick={() => setViewMode("raw")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            viewMode === "raw"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.rawDataView}
        </button>
      </div>

      {viewMode === "raw" ? (
        <RawDataTable language={language} data={data} />
      ) : (
        <>
          <KpiCards language={language} summary={data.summary} />
          <ParticipantTable
            language={language}
            participants={data.participants}
            totalCommands={data.summary.totalCommands}
          />
          <div className="grid gap-6 md:grid-cols-2">
            <ErrorHotspots language={language} errorHotspots={data.errorHotspots} />
            <HelpDistribution language={language} helpBySection={data.helpBySection} />
          </div>
          <InstructorTimeline language={language} timeline={data.instructorTimeline} />
        </>
      )}
    </div>
  );
}
