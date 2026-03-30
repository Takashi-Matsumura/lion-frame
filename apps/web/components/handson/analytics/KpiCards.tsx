import { handsonTranslations } from "../translations";
import type { Language, AnalyticsData } from "../types";

interface Props {
  language: Language;
  summary: AnalyticsData["summary"];
}

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  green: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-lg p-3 text-center ${COLOR_CLASSES[color] || COLOR_CLASSES.blue}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs opacity-80">{label}</div>
    </div>
  );
}

export default function KpiCards({ language, summary }: Props) {
  const t = handsonTranslations[language].analytics;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <KpiCard label={t.participants} value={String(summary.participantCount)} color="blue" />
      <KpiCard label={t.duration} value={`${summary.durationMinutes}${t.minutes}`} color="cyan" />
      <KpiCard label={t.avgCompletion} value={`${summary.avgCompletionRate}%`} color="green" />
      <KpiCard label={t.totalErrors} value={String(summary.totalErrors)} color="red" />
      <KpiCard label={t.helpRequests} value={String(summary.totalHelpRequests)} color="amber" />
    </div>
  );
}
