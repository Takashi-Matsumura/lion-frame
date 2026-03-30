import { handsonTranslations } from "../translations";
import type { Language, AnalyticsData } from "../types";

interface Props {
  language: Language;
  data: AnalyticsData;
}

const TYPE_COLORS: Record<string, string> = {
  SESSION_JOIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SESSION_LEAVE: "bg-muted text-muted-foreground",
  COMMAND_OK: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  COMMAND_ERROR: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CHECKPOINT_COMPLETE: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  HELP_REQUEST: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  HELP_RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  INSTRUCTOR_CHECKPOINT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function RawDataTable({ language, data }: Props) {
  const tc = handsonTranslations[language].common;
  const t = handsonTranslations[language].analytics;
  const typeLabels = t.typeLabels;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "500px" }}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t.time}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t.type}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t.participant}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t.detail}</th>
            </tr>
          </thead>
          <tbody>
            {data.rawLogs.map((log) => (
              <tr key={log.id} className="border-b hover:bg-muted/30">
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleTimeString(language === "ja" ? "ja-JP" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="px-3 py-1.5">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[log.type] || "bg-muted text-muted-foreground"}`}>
                    {typeLabels[log.type as keyof typeof typeLabels] || log.type}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-foreground">
                  {log.seatNumber != null && (
                    <span className="mr-1 font-semibold">{log.seatNumber}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{log.participantName}</span>
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  {log.commandIndex != null && `#${log.commandIndex + 1}`}
                  {log.sectionIndex != null && log.commandIndex == null && `${tc.section} ${log.sectionIndex + 1}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
